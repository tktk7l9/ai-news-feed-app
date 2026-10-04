import { test } from "node:test";
import assert from "node:assert/strict";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { GenerateJson, generateDigest, type GenerateJsonRequest } from "./digest.ts";

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
