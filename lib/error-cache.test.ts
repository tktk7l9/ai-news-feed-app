import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ERROR_REVALIDATE_SECONDS, createErrorCacheShortener } from "./error-cache.ts";

// Pages are statically regenerated every hour. A page rendered while the backend is down must
// not be served for that hour after the backend recovers (SHIG 55).
const PAGE_REVALIDATE_SECONDS = 3600;

type CacheOptions = { revalidate?: number | false };

function fakeCache() {
  const calls: { keyParts: string[]; options: CacheOptions }[] = [];
  let invocations = 0;
  const cacheFn = (cb: () => Promise<unknown>, keyParts: string[], options: CacheOptions) => {
    calls.push({ keyParts, options });
    return async () => {
      invocations++;
      return cb();
    };
  };
  return { cacheFn, calls, invocations: () => invocations };
}

test("the error revalidate window is short and positive", () => {
  assert.ok(ERROR_REVALIDATE_SECONDS > 0, "0 would make an ISR page throw at runtime");
  assert.ok(ERROR_REVALIDATE_SECONDS <= 60);
  assert.ok(ERROR_REVALIDATE_SECONDS < PAGE_REVALIDATE_SECONDS);
});

test("the shortener registers one cache entry with the short revalidate and a stable key", () => {
  const fake = fakeCache();
  createErrorCacheShortener(fake.cacheFn);
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].options.revalidate, ERROR_REVALIDATE_SECONDS);
  assert.ok(fake.calls[0].keyParts.length > 0);
  assert.ok(fake.calls[0].keyParts.every((k) => typeof k === "string" && k.length > 0));
});

test("each call touches the short-lived cache entry so the render adopts its window", async () => {
  const fake = fakeCache();
  const shorten = createErrorCacheShortener(fake.cacheFn);
  await shorten();
  await shorten();
  assert.equal(fake.invocations(), 2);
});

test("a failing cache never turns a degraded page into a crash", async () => {
  const logged: unknown[][] = [];
  const shorten = createErrorCacheShortener(
    () => async () => {
      throw new Error("Invariant: incrementalCache missing");
    },
    (...a) => logged.push(a),
  );
  await assert.doesNotReject(shorten());
  assert.equal(logged.length, 1);
  assert.match(String(logged[0].join(" ")), /incrementalCache missing/);
});

test("every load error in lib/queries.ts goes through the cache shortener", () => {
  const src = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
  const direct = src.match(/\btoLoadError\(/g) ?? [];
  // Exactly one direct call: inside the helper that also shortens the page cache.
  assert.equal(direct.length, 1, "call loadFailed() instead of toLoadError() in queries.ts");
  assert.match(src, /async function loadFailed\([^)]*\)[^{]*\{[^}]*shortenPageCacheAfterError\(\)/);
});
