import { test } from "node:test";
import assert from "node:assert/strict";
import { LOAD_ERROR_MESSAGE, describeError, toLoadError } from "./load-error.ts";

test("toLoadError returns user text and never leaks backend detail", () => {
  const logged: unknown[][] = [];
  const msg = toLoadError("latest digest", { message: "connection refused" }, (...a) => {
    logged.push(a);
  });
  assert.equal(msg, LOAD_ERROR_MESSAGE);
  assert.ok(!msg.includes("connection refused"));
  assert.ok(!/supabase|NEXT_PUBLIC|SERVICE_ROLE/i.test(msg));
});

test("toLoadError logs the raw detail server-side with its context", () => {
  const logged: unknown[][] = [];
  toLoadError("archive dates", new Error("timeout"), (...a) => {
    logged.push(a);
  });
  assert.equal(logged.length, 1);
  assert.match(String(logged[0].join(" ")), /archive dates/);
  assert.match(String(logged[0].join(" ")), /timeout/);
});

test("the user message is constructive: says what happened and what to do", () => {
  assert.match(LOAD_ERROR_MESSAGE, /読み込めませんでした/);
  assert.match(LOAD_ERROR_MESSAGE, /再読み込み/);
});

test("describeError handles strings, Errors, PostgREST objects and junk", () => {
  assert.equal(describeError("x"), "x");
  assert.equal(describeError(new Error("boom")), "boom");
  assert.equal(describeError({ message: "pg" }), "pg");
  assert.equal(describeError(null), "unknown error");
  assert.equal(describeError({ code: 1 }), '{"code":1}');
});
