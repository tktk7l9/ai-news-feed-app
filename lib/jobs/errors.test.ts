import { test } from "node:test";
import assert from "node:assert/strict";
import { DigestStepError, describe } from "./errors.ts";

test("describe appends the PostgREST code to the message", () => {
  assert.equal(describe({ message: "permission denied", code: "42501", details: "" }), "permission denied (code=42501)");
});

test("describe falls back to describeError when there is no code", () => {
  assert.equal(describe(new Error("fetch failed")), "fetch failed");
  assert.equal(describe("no active sources"), "no active sources");
  assert.equal(describe({ message: "x", code: "" }), "x");
});

test("DigestStepError names the step in its message", () => {
  const error = new DigestStepError({ step: "save_raw", cause: { message: "timeout", code: "57014" } });
  assert.equal(error._tag, "DigestStepError");
  assert.equal(error.message, "digest step save_raw failed: timeout (code=57014)");
});
