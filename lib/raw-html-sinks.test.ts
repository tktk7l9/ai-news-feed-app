import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Trust boundary of the CSP nonce (lib/csp-nonce.ts): the Worker stamps the nonce on every inline
// JavaScript <script> in the HTML, injected or not, and news text comes from external RSS feeds
// and Gemini. The nonce only stays meaningful while that text never reaches a raw-HTML sink, so
// this test fails on any sink outside the allowlist below.

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** "path/to/file.tsx": "why this use is safe". Empty on purpose: the app renders text only. */
const ALLOWED: Record<string, string> = {};

const SINKS: [string, RegExp][] = [
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\s*[=:]/],
  ["__html", /\b__html\s*:/],
  ["innerHTML / outerHTML assignment", /\.(?:inner|outer)HTML\s*(?:\+?=)(?!=)/],
  ["insertAdjacentHTML", /\binsertAdjacentHTML\s*\(/],
  ["document.write", /\bdocument\s*\.\s*write(?:ln)?\s*\(/],
  ["createContextualFragment", /\bcreateContextualFragment\s*\(/],
];

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const TEST = /\.test\.[cm]?[jt]sx?$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SOURCE.test(name) && !TEST.test(name) ? [path] : [];
  });
}

const files = [
  ...["app", "components", "lib"].flatMap((d) => sourceFiles(join(ROOT, d))),
  ...readdirSync(ROOT)
    .filter((name) => SOURCE.test(name) && !TEST.test(name))
    .map((name) => join(ROOT, name)),
];

test("the scan covers the app's source files", () => {
  const rel = files.map((f) => relative(ROOT, f));
  for (const expected of ["app/page.tsx", "components/ArticleCard.tsx", "lib/csp-nonce.ts", "worker.js"]) {
    assert.ok(rel.includes(expected), `${expected} is scanned`);
  }
});

test("no raw-HTML sink outside the allowlist (news text must stay escaped React text)", () => {
  const found: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (rel in ALLOWED) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const [name, pattern] of SINKS) if (pattern.test(line)) found.push(`${rel}:${i + 1} ${name}`);
      });
  }
  assert.deepEqual(found, []);
});

test("each sink pattern catches its sink and ignores a mere mention", () => {
  const hits = (line: string) => SINKS.filter(([, p]) => p.test(line)).map(([name]) => name);
  assert.deepEqual(hits("<div dangerouslySetInnerHTML={{ __html: html }} />"), ["dangerouslySetInnerHTML", "__html"]);
  assert.deepEqual(hits("createElement('div', { dangerouslySetInnerHTML: x })"), ["dangerouslySetInnerHTML"]);
  assert.deepEqual(hits("el.innerHTML = text;"), ["innerHTML / outerHTML assignment"]);
  assert.deepEqual(hits("el.outerHTML += text;"), ["innerHTML / outerHTML assignment"]);
  assert.deepEqual(hits("el.insertAdjacentHTML('beforeend', text)"), ["insertAdjacentHTML"]);
  assert.deepEqual(hits("document.write(text)"), ["document.write"]);
  assert.deepEqual(hits("range.createContextualFragment(text)"), ["createContextualFragment"]);
  // Reading markup and talking about the prop are fine.
  assert.deepEqual(hits("expect(container.innerHTML).toBe('')"), []);
  assert.deepEqual(hits("if (a.innerHTML === b) {}"), []);
  assert.deepEqual(hits("// never use dangerouslySetInnerHTML here"), []);
});
