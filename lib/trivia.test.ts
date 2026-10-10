import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_TRIVIA, pickRandomTrivia } from "./trivia.ts";

// The pool is grown in content PRs; the count is not pinned so that adding entries
// never breaks CI. These checks guard the editorial standard instead (see PR #45).
test("the pool is large enough that one page view rarely repeats", () => {
  assert.ok(AI_TRIVIA.length >= 100, `only ${AI_TRIVIA.length} entries`);
});

test("entries are unique", () => {
  assert.equal(new Set(AI_TRIVIA).size, AI_TRIVIA.length);
});

test("every entry is a polite Japanese sentence of similar length", () => {
  for (const t of AI_TRIVIA) {
    const length = [...t].length;
    assert.ok(length >= 40 && length <= 140, `length ${length}: ${t}`);
    assert.match(t, /(です|ます|ません|でした|います|ました)。$/, `must end with です/ます: ${t}`);
    assert.doesNotMatch(t, /[（）]/, `use half-width parentheses: ${t}`);
    assert.equal(t.trim(), t, `no surrounding whitespace: ${t}`);
  }
});

test("pickRandomTrivia returns an entry from the pool", () => {
  for (let i = 0; i < 20; i++) assert.ok(AI_TRIVIA.includes(pickRandomTrivia()));
});
