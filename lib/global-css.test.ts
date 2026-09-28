import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Cascade contract for app/globals.css. Unlayered author rules beat every Tailwind utility
// (utilities live in @layer utilities), so a global :focus-visible outside a layer silently
// overrides focus-visible:outline-none / focus:outline-none and draws a second focus ring
// inside the article cards and around <main> after the skip link.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// Returns the text of every top-level block, paired with the prelude that opened it.
function topLevelBlocks(src: string): { prelude: string; body: string }[] {
  const out: { prelude: string; body: string }[] = [];
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  let start = 0;
  let preludeStart = 0;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        out.push({ prelude: stripped.slice(preludeStart, start).trim(), body: stripped.slice(start + 1, i) });
        preludeStart = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      preludeStart = i + 1;
    }
  }
  return out;
}

test("the global :focus-visible rule lives in a cascade layer", () => {
  const blocks = topLevelBlocks(css);
  const withFocus = blocks.filter((b) => b.prelude.includes(":focus-visible") || b.body.includes(":focus-visible"));
  assert.ok(withFocus.length > 0, "globals.css should still define a visible focus style");
  for (const b of withFocus) {
    assert.match(b.prelude, /^@layer\s+base$/, `unlayered focus rule found under "${b.prelude}"`);
  }
});

test("the layered focus style keeps a visible outline in both colour schemes", () => {
  const base = topLevelBlocks(css).find((b) => /^@layer\s+base$/.test(b.prelude));
  assert.ok(base);
  assert.match(base.body, /outline:\s*2px solid #b45309/);
  assert.match(base.body, /prefers-color-scheme:\s*dark[\s\S]*outline-color:\s*#fbbf24/);
});
