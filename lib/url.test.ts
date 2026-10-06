import { test } from "node:test";
import assert from "node:assert/strict";
import { isHttpUrl, safeHref } from "./url.ts";

test("isHttpUrl accepts only absolute http(s) URLs", () => {
  assert.equal(isHttpUrl("https://example.com/a?b=1"), true);
  assert.equal(isHttpUrl("http://example.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("data:text/html,hi"), false);
  assert.equal(isHttpUrl("ftp://example.com/x"), false);
  assert.equal(isHttpUrl("/relative"), false);
  assert.equal(isHttpUrl(""), false);
});

test("safeHref neutralises anything that is not http(s)", () => {
  assert.equal(safeHref("https://example.com/"), "https://example.com/");
  assert.equal(safeHref("javascript:alert(1)"), "#");
  assert.equal(safeHref("not a url"), "#");
});
