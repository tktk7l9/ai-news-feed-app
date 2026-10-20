import { test } from "node:test";
import assert from "node:assert/strict";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import {
  GenerateJson,
  generateDigest,
  isTransientGeminiError,
  normalizeClassifications,
  normalizeSummaries,
  retryDelayMs,
  type GenerateJsonRequest,
} from "./digest.ts";

const input = (id: string) => ({
  raw_id: id,
  source_name: "src",
  title: `title ${id}`,
  url: `https://example.com/${id}`,
  raw_content: "body",
});

/** A GenerateJson stub answering from a script (a string reply or an Error to throw), counting calls. */
function scripted(replies: (string | Error)[]) {
  const calls: GenerateJsonRequest[] = [];
  const impl = async (req: GenerateJsonRequest) => {
    calls.push(req);
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { impl, calls };
}

const run = <A, E>(effect: Effect.Effect<A, E>, impl: (req: GenerateJsonRequest) => Promise<string>) =>
  Effect.runPromise(
    effect.pipe(Effect.provideService(GenerateJson, impl), Effect.provide(TestClock.layer())) as Effect.Effect<A>,
  );

const settle = Effect.promise(() => new Promise<void>((r) => setTimeout(r, 0)));
const advance = (ms: number) =>
  Effect.gen(function* () {
    yield* settle;
    yield* TestClock.adjust(ms);
    yield* settle;
  });

const filterReply = (ids: string[], importance = 4) =>
  JSON.stringify({
    articles: ids.map((raw_id) => ({
      raw_id,
      should_include: true,
      category: "llm",
      importance,
      is_model_release: false,
    })),
  });

test("an empty input returns the no-news overview without calling Gemini", async () => {
  const { impl, calls } = scripted([]);
  const result = await run(generateDigest([]), impl);
  assert.equal(result.articles.length, 0);
  assert.match(result.overview_ja, /ありませんでした/);
  assert.equal(calls.length, 0);
});

test("classifies, then summarizes only the accepted articles", async () => {
  const ids = ["a", "b", "c", "d", "e"];
  const { impl, calls } = scripted([
    filterReply(ids),
    JSON.stringify({
      overview_ja: "総括",
      articles: [{ raw_id: "a", title_ja: "見出し", summary_ja: "要約" }],
    }),
  ]);
  const result = await run(generateDigest(ids.map(input)), impl);
  assert.deepEqual(
    calls.map((c) => c.stage),
    ["filter", "summarize"],
  );
  assert.equal(result.overview_ja, "総括");
  assert.equal(result.articles.find((a) => a.raw_id === "a")?.title_ja, "見出し");
  assert.equal(result.articles.find((a) => a.raw_id === "b")?.title_ja, "");
});

test("skips the summarize call when nothing passes the filter", async () => {
  const { impl, calls } = scripted([filterReply(["a"], 1)]);
  const result = await run(generateDigest([input("a")]), impl);
  assert.equal(calls.length, 1);
  assert.equal(result.articles[0].summary_ja, "");
});

test("recovers JSON that contains raw control characters", async () => {
  const broken = '{"articles":[{"raw_id":"a","should_include":false,"category":"llm","importance":1,"is_model_release":false,"note":"x\ty"}]}';
  const { impl } = scripted([broken]);
  const result = await run(generateDigest([input("a")]), impl);
  assert.equal(result.articles.length, 1);
});

test("retries a failed call after 1s and then 2s", async () => {
  const { impl, calls } = scripted([new Error("503"), new Error("503"), filterReply(["a"], 1)]);
  const program = Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(generateDigest([input("a")]));
    yield* advance(0);
    assert.equal(calls.length, 1);
    yield* advance(999);
    assert.equal(calls.length, 1);
    yield* advance(1);
    assert.equal(calls.length, 2);
    yield* advance(1_999);
    assert.equal(calls.length, 2);
    yield* advance(1);
    return yield* Fiber.join(fiber);
  });
  const original = console.warn;
  console.warn = () => {};
  try {
    await run(program, impl);
  } finally {
    console.warn = original;
  }
  assert.equal(calls.length, 3);
});

test("fails with a GeminiError naming the stage after 3 attempts", async () => {
  const { impl, calls } = scripted([new Error("quota exceeded")]);
  const program = Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(Effect.flip(generateDigest([input("a")])));
    for (let i = 0; i < 5; i++) yield* advance(10_000);
    return yield* Fiber.join(fiber);
  });
  const original = console.warn;
  console.warn = () => {};
  let error;
  try {
    error = await run(program, impl);
  } finally {
    console.warn = original;
  }
  assert.equal(calls.length, 3);
  assert.equal(error._tag, "GeminiError");
  assert.equal(error.stage, "filter");
  assert.equal(error.message, "gemini filter failed: quota exceeded");
});

/** Shaped like the SDK's GoogleGenerativeAIFetchError: the HTTP status sits on `status`. */
const httpError = (status: number, text: string) =>
  Object.assign(new Error(`[GoogleGenerativeAI Error]: Error fetching from https://gemini.test: [${status}] ${text}`), {
    status,
  });

/** Runs generateDigest under the test clock, stepping time and recording when each call happened. */
async function callTimes(replies: (string | Error)[], steps: number[]) {
  const { impl, calls } = scripted(replies);
  const times: number[] = [];
  let now = 0;
  const timed = async (req: GenerateJsonRequest) => {
    times.push(now);
    return impl(req);
  };
  const program = Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(Effect.result(generateDigest([input("a")])));
    yield* advance(0);
    for (const ms of steps) {
      now += ms; // the retry fires inside advance(), so the clock reading moves first
      yield* advance(ms);
    }
    return yield* Fiber.join(fiber);
  });
  const original = console.warn;
  console.warn = () => {};
  try {
    const result = await run(program, timed);
    return { result, calls, times };
  } finally {
    console.warn = original;
  }
}

test("waits 15s, 45s, then 135s between attempts while Gemini answers 503, and recovers", async () => {
  const overloaded = httpError(503, "This model is currently experiencing high demand.");
  // Stopping 1ms short of each delay proves no retry fires early.
  const steps = [14_999, 1, 44_999, 1, 134_999, 1];
  const { result, calls, times } = await callTimes([overloaded, overloaded, overloaded, filterReply(["a"], 1)], steps);
  assert.equal(calls.length, 4);
  assert.deepEqual(times, [0, 15_000, 60_000, 195_000]);
  assert.equal(result._tag, "Success");
});

test("gives up after 4 attempts on a transient error and names the stage", async () => {
  const { result, calls } = await callTimes([httpError(429, "Resource has been exhausted")], [15_000, 45_000, 135_000, 600_000]);
  assert.equal(calls.length, 4);
  assert.equal(result._tag, "Failure");
  if (result._tag === "Failure") {
    assert.equal(result.failure.stage, "filter");
    assert.match(result.failure.message, /^gemini filter failed: .*\[429\]/);
  }
});

test("a request the API rejects (400) is not waited out: 3 attempts, 1s apart then 2s", async () => {
  const { calls, times } = await callTimes([httpError(400, "Invalid JSON payload")], [999, 1, 1_999, 1, 600_000]);
  assert.equal(calls.length, 3);
  assert.deepEqual(times, [0, 1_000, 3_000]);
});

test("isTransientGeminiError: overload, rate limit, server errors and dropped connections only", () => {
  for (const status of [408, 429, 500, 502, 503, 504]) assert.equal(isTransientGeminiError(httpError(status, "")), true, String(status));
  for (const status of [400, 401, 403, 404]) assert.equal(isTransientGeminiError(httpError(status, "")), false, String(status));
  // The SDK rethrows a fetch that never got a status (Workers: "Network connection lost.").
  assert.equal(
    isTransientGeminiError(new Error("[GoogleGenerativeAI Error]: Error fetching from https://gemini.test: Network connection lost.")),
    true,
  );
  assert.equal(isTransientGeminiError(new Error("[GoogleGenerativeAI Error]: Request aborted when fetching https://gemini.test: x")), true);
  assert.equal(isTransientGeminiError(new Error("[GoogleGenerativeAI Error]: Candidate was blocked due to SAFETY")), false);
  assert.equal(isTransientGeminiError(new Error("503")), false);
  assert.equal(isTransientGeminiError("Error fetching from"), false);
  assert.equal(isTransientGeminiError(null), false);
});

test("retryDelayMs follows the attempt count and gives up past the last delay", () => {
  const overloaded = httpError(503, "");
  assert.deepEqual([1, 2, 3, 4].map((n) => retryDelayMs(overloaded, n)), [15_000, 45_000, 135_000, null]);
  assert.deepEqual([1, 2, 3].map((n) => retryDelayMs(new Error("boom"), n)), [1_000, 2_000, null]);
});

test("normalizeClassifications pins category, importance and ids before they reach the database", () => {
  const known = new Set(["a", "b"]);
  const result = normalizeClassifications(
    [
      { raw_id: "a", should_include: "yes", category: "weapons", importance: 9, is_model_release: "true" },
      { raw_id: "b", should_include: true, category: "llm", importance: "3.6", is_model_release: true },
      { raw_id: "b", should_include: true, category: "llm", importance: 5, is_model_release: true },
      { raw_id: "invented", should_include: true, category: "llm", importance: 5, is_model_release: false },
      { should_include: true, category: "llm", importance: 5 },
      "not an object",
      null,
    ],
    known,
  );
  assert.deepEqual(result, [
    { raw_id: "a", should_include: false, category: "other", importance: 5, is_model_release: false },
    { raw_id: "b", should_include: true, category: "llm", importance: 4, is_model_release: true },
  ]);
  assert.deepEqual(normalizeClassifications({ articles: [] }, known), []);
  assert.deepEqual(normalizeClassifications([{ raw_id: "a", importance: "lots" }], known)[0].importance, 1);
  assert.deepEqual(normalizeClassifications([{ raw_id: "a", importance: -4 }], known)[0].importance, 1);
});

test("normalizeSummaries keeps text only, trims it and cuts runaway lengths", () => {
  const map = normalizeSummaries([
    { raw_id: "a", title_ja: "  見出し  ", summary_ja: "x".repeat(5000) },
    { raw_id: "a", title_ja: "duplicate", summary_ja: "ignored" },
    { raw_id: "b", title_ja: { html: "<b>x</b>" }, summary_ja: 42 },
    { title_ja: "no id" },
    7,
  ]);
  assert.equal(map.size, 2);
  assert.equal(map.get("a")?.title_ja, "見出し");
  assert.equal(map.get("a")?.summary_ja.length, 2000);
  assert.deepEqual(map.get("b"), { raw_id: "b", title_ja: "", summary_ja: "" });
  assert.equal(normalizeSummaries("nope").size, 0);
});

test("a reply with an out-of-range importance and an unknown category still yields a usable digest", async () => {
  const { impl } = scripted([
    JSON.stringify({
      articles: [
        { raw_id: "a", should_include: true, category: "banana", importance: 42, is_model_release: false },
        { raw_id: "ghost", should_include: true, category: "llm", importance: 5, is_model_release: true },
      ],
    }),
    JSON.stringify({ overview_ja: 123, articles: [{ raw_id: "a", title_ja: "t", summary_ja: "s" }] }),
  ]);
  const result = await run(generateDigest([input("a")]), impl);
  assert.deepEqual(
    result.articles.map((a) => [a.raw_id, a.category, a.importance]),
    [["a", "other", 5]],
  );
  assert.match(result.overview_ja, /ありませんでした/);
});
