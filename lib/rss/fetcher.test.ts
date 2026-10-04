import { test } from "node:test";
import assert from "node:assert/strict";
import { Effect } from "effect";
import { ParseFeed, fetchAllSources } from "./fetcher.ts";
import type { Source } from "../types.ts";

const source = (id: string, feed_url: string) => ({ id, name: id, feed_url }) as unknown as Source;
const recent = new Date().toISOString();
const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

const run = (sources: Source[], parse: (url: string) => Promise<unknown>) =>
  Effect.runPromise(
    fetchAllSources(sources).pipe(Effect.provideService(ParseFeed, parse as never)),
  );

test("keeps recent items with a link and a title, and drops the rest", async () => {
  const [result] = await run([source("s1", "https://a.example/feed")], async () => ({
    items: [
      { link: "https://a.example/1", title: "new", isoDate: recent, contentSnippet: "x" },
      { link: "https://a.example/2", title: "old", isoDate: old },
      { title: "no link", isoDate: recent },
      { link: "https://a.example/3", title: "undated" },
    ],
  }));
  assert.deepEqual(
    result.articles.map((a) => a.title),
    ["new", "undated"],
  );
  assert.equal(result.error, undefined);
});

test("turns one failing feed into an error without failing the others", async () => {
  const results = await run(
    [source("ok", "https://ok.example/feed"), source("bad", "https://bad.example/feed")],
    async (url) => {
      if (url.includes("bad")) throw new Error("socket hang up");
      return { items: [{ link: "https://ok.example/1", title: "t", isoDate: recent }] };
    },
  );
  assert.equal(results[0].articles.length, 1);
  assert.equal(results[1].error, "Error: socket hang up");
  assert.equal(results[1].articles.length, 0);
});

test("refuses non-http protocols and reports an invalid URL as an error", async () => {
  let calls = 0;
  const results = await run(
    [source("file", "file:///etc/passwd"), source("broken", "not a url")],
    async () => {
      calls++;
      return { items: [] };
    },
  );
  assert.equal(results[0].error, "disallowed protocol: file:");
  assert.match(results[1].error ?? "", /Invalid URL/);
  assert.equal(calls, 0);
});

test("fetches every source in parallel", async () => {
  let inFlight = 0;
  let peak = 0;
  await run(
    ["a", "b", "c"].map((id) => source(id, `https://${id}.example/feed`)),
    async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { items: [] };
    },
  );
  assert.equal(peak, 3);
});
