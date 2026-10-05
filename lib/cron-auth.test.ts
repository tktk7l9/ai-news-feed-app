import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCron } from "./cron-auth.ts";

test("isAuthorizedCron accepts the exact bearer token", () => {
  assert.equal(isAuthorizedCron("Bearer s3cret", "s3cret"), true);
});

test("isAuthorizedCron rejects a wrong, missing or differently-shaped token", () => {
  assert.equal(isAuthorizedCron("Bearer nope", "s3cret"), false);
  assert.equal(isAuthorizedCron("s3cret", "s3cret"), false);
  assert.equal(isAuthorizedCron(null, "s3cret"), false);
});

test("isAuthorizedCron never authorizes when the secret is unset", () => {
  assert.equal(isAuthorizedCron("Bearer ", undefined), false);
  assert.equal(isAuthorizedCron("Bearer ", ""), false);
});
