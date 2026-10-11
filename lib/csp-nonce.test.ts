import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";
import {
  applyScriptNonce,
  createNonce,
  CSP_HEADER,
  isInlineJavaScript,
  type Rewriter,
  type ScriptElement,
  withScriptNonce,
} from "./csp-nonce.ts";

// The static policy next.config.ts serves today, so these tests follow any change to it.
const STATIC_CSP = await (async () => {
  const rules = await nextConfig.headers!();
  const header = rules.flatMap((r) => r.headers).find((h) => h.key === CSP_HEADER);
  assert.ok(header, "next.config.ts sets a CSP");
  return header.value;
})();

/** Records the handler so tests can feed it fake <script> elements. */
function fakeRewriter() {
  const calls: { selector: string; handler: (el: ScriptElement) => void }[] = [];
  const transformed: Response[] = [];
  const rewriter: Rewriter = {
    on(selector, handlers) {
      calls.push({ selector, handler: handlers.element });
      return rewriter;
    },
    transform(response) {
      transformed.push(response);
      return response;
    },
  };
  return { rewriter: () => rewriter, calls, transformed };
}

/** A fake <script> element. Like HTMLRewriter, attribute names are matched case-insensitively. */
function script(attrs: Record<string, string>) {
  const find = (name: string) => Object.keys(attrs).find((k) => k.toLowerCase() === name.toLowerCase());
  return {
    attrs,
    hasAttribute: (name: string) => find(name) !== undefined,
    getAttribute: (name: string) => {
      const key = find(name);
      return key === undefined ? null : attrs[key];
    },
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
  };
}

function html(headers: Record<string, string> = {}) {
  return new Response("<html><script>1</script></html>", {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "text/html; charset=utf-8", [CSP_HEADER]: STATIC_CSP, ...headers },
  });
}

describe("createNonce", () => {
  test("returns 128 random bits as base64, different every call", () => {
    const a = createNonce();
    assert.match(a, /^[A-Za-z0-9+/]{22}==$/);
    assert.equal(Buffer.from(a, "base64").length, 16);
    const many = new Set(Array.from({ length: 200 }, createNonce));
    assert.equal(many.size, 200);
  });
});

describe("withScriptNonce", () => {
  test("replaces 'unsafe-inline' in script-src only, keeping 'self' and the beacon host", () => {
    const out = withScriptNonce(STATIC_CSP, "abc");
    assert.ok(out);
    assert.ok(out.includes("script-src 'self' 'nonce-abc' https://static.cloudflareinsights.com;"), out);
    // style-src keeps 'unsafe-inline' (React style attributes), which Observatory accepts.
    assert.ok(out.includes("style-src 'self' 'unsafe-inline';"), out);
    assert.doesNotMatch(out, /script-src[^;]*unsafe-inline/);
    // Only the script-src token changes; the rest of the policy is byte-identical.
    assert.equal(out, STATIC_CSP.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'nonce-abc'"));
  });

  test("never adds 'strict-dynamic' (it would turn off 'self' and the beacon host source)", () => {
    assert.ok(!STATIC_CSP.includes("strict-dynamic"));
    assert.ok(!withScriptNonce(STATIC_CSP, "abc")!.includes("strict-dynamic"));
  });

  test("handles script-src as the first directive", () => {
    assert.equal(withScriptNonce("script-src 'unsafe-inline'; img-src 'self'", "n"), "script-src 'nonce-n'; img-src 'self'");
  });

  test("returns null when there is nothing to tighten", () => {
    assert.equal(withScriptNonce("default-src 'self'; script-src 'self'", "n"), null);
    assert.equal(withScriptNonce("style-src 'unsafe-inline'", "n"), null);
  });
});

describe("isInlineJavaScript", () => {
  const cases: [string, Record<string, string>, boolean][] = [
    // Inline classic / module JavaScript: needs the nonce.
    ["no type (Next's RSC payload and bootstrap)", {}, true],
    ["empty type", { type: "" }, true],
    ["text/javascript", { type: "text/javascript" }, true],
    ["application/javascript", { type: "application/javascript" }, true],
    ["a legacy JavaScript MIME type", { type: "text/x-ecmascript" }, true],
    ["a JavaScript MIME type in another case, padded with ASCII whitespace", { type: " \tText/JavaScript\n" }, true],
    ["module", { type: "module" }, true],
    ["MODULE", { type: "MODULE" }, true],
    ["an empty language attribute", { language: "" }, true],
    // External scripts: 'self' and the host sources decide, never the nonce.
    ["src", { src: "/_next/static/chunks/a.js" }, false],
    ["SRC in upper case", { SRC: "https://evil.example/x.js" }, false],
    ["src with a module type", { src: "/a.js", type: "module" }, false],
    ["href (SVG <script>)", { href: "https://evil.example/x.js" }, false],
    ["xlink:href (SVG <script>)", { "xlink:href": "https://evil.example/x.js" }, false],
    ["an empty href", { href: "" }, false],
    // Data blocks and other non-JavaScript types never run as scripts.
    ["application/ld+json", { type: "application/ld+json" }, false],
    ["application/json", { type: "application/json" }, false],
    ["text/plain", { type: "text/plain" }, false],
    ["a template type", { type: "text/x-template" }, false],
    ["importmap", { type: "importmap" }, false],
    ["speculationrules", { type: "speculationrules" }, false],
    ["a JavaScript type with parameters", { type: "text/javascript; charset=utf-8" }, false],
    ["the non-standard type=javascript", { type: "javascript" }, false],
    ["a whitespace-only type", { type: "  " }, false],
    ["a type padded with non-ASCII whitespace", { type: " module" }, false],
    ["an entity-encoded type (HTMLRewriter does not decode it)", { type: "&#109;odule" }, false],
    // The legacy language attribute without a type is never emitted by Next: fail closed.
    ["language=javascript without a type", { language: "javascript" }, false],
    ["language=vbscript without a type", { language: "vbscript" }, false],
  ];
  for (const [label, attrs, expected] of cases) {
    test(`${expected ? "stamps" : "skips"} ${label}`, () => {
      assert.equal(isInlineJavaScript(script({ ...attrs })), expected);
    });
  }

  test("a type attribute decides over language, as in browsers", () => {
    assert.equal(isInlineJavaScript(script({ type: "text/javascript", language: "vbscript" })), true);
    assert.equal(isInlineJavaScript(script({ type: "text/plain", language: "javascript" })), false);
  });
});

describe("applyScriptNonce", () => {
  afterEach(() => {
    delete (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter;
  });

  test("swaps the CSP for a nonce one and stamps inline JavaScript only", () => {
    const fake = fakeRewriter();
    const out = applyScriptNonce(html({ etag: '"x"', "content-length": "31" }), {
      nonce: "N",
      rewriter: fake.rewriter,
    });

    assert.equal(out.status, 200);
    assert.equal(out.statusText, "OK");
    assert.ok(out.headers.get(CSP_HEADER)!.includes("script-src 'self' 'nonce-N' https://static.cloudflareinsights.com;"));
    assert.equal(out.headers.get("etag"), null);
    assert.equal(out.headers.get("content-length"), null);
    assert.equal(out.headers.get("content-type"), "text/html; charset=utf-8");

    assert.equal(fake.calls.length, 1);
    assert.equal(fake.calls[0].selector, "script");
    const bootstrap = script({});
    const rscPayload = script({ id: "_R_" });
    const ldJson = script({ type: "application/ld+json" });
    const chunk = script({ src: "/_next/static/chunks/a.js", async: "" });
    const svgExternal = script({ href: "https://evil.example/x.js" });
    for (const el of [bootstrap, rscPayload, ldJson, chunk, svgExternal]) fake.calls[0].handler(el);
    assert.equal(bootstrap.attrs.nonce, "N");
    assert.equal(rscPayload.attrs.nonce, "N");
    assert.equal(ldJson.attrs.nonce, undefined);
    assert.equal(chunk.attrs.nonce, undefined);
    assert.equal(svgExternal.attrs.nonce, undefined);
  });

  test("keeps exactly one CSP header, also on 404 pages", () => {
    const notFound = new Response("<p>", {
      status: 404,
      headers: { "content-type": "text/html", [CSP_HEADER]: STATIC_CSP },
    });
    for (const res of [html(), notFound]) {
      const out = applyScriptNonce(res, { nonce: "N", rewriter: fakeRewriter().rewriter });
      assert.equal(out.headers.get(CSP_HEADER)!.match(/default-src/g)!.length, 1);
      assert.equal(out.status, res.status);
    }
  });

  test("generates a fresh nonce per call by default", () => {
    const fake = fakeRewriter();
    const a = applyScriptNonce(html(), { rewriter: fake.rewriter });
    const b = applyScriptNonce(html(), { rewriter: fake.rewriter });
    assert.notEqual(a.headers.get(CSP_HEADER), b.headers.get(CSP_HEADER));
  });

  const untouched: [string, () => Response][] = [
    ["non-HTML", () => new Response("{}", { headers: { "content-type": "application/json", [CSP_HEADER]: STATIC_CSP } })],
    ["RSC", () => new Response("0:[]", { headers: { "content-type": "text/x-component", [CSP_HEADER]: STATIC_CSP } })],
    ["no content-type", () => new Response(new Uint8Array([120]), { headers: { [CSP_HEADER]: STATIC_CSP } })],
    ["no body", () => new Response(null, { status: 304, headers: { "content-type": "text/html" } })],
    ["no CSP", () => new Response("<p>", { headers: { "content-type": "text/html" } })],
    [
      "CSP without 'unsafe-inline'",
      () => new Response("<p>", { headers: { "content-type": "text/html", [CSP_HEADER]: "script-src 'self'" } }),
    ],
  ];
  for (const [label, make] of untouched) {
    test(`passes ${label} responses through untouched`, () => {
      const fake = fakeRewriter();
      const response = make();
      assert.equal(applyScriptNonce(response, { rewriter: fake.rewriter }), response);
      assert.equal(fake.calls.length, 0);
    });
  }

  test("needs no options for responses it leaves alone", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    assert.equal(applyScriptNonce(json), json);
  });

  test("uses the Workers HTMLRewriter by default", () => {
    const fake = fakeRewriter();
    (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter = class {
      constructor() {
        return fake.rewriter();
      }
    };
    applyScriptNonce(html(), { nonce: "N" });
    assert.equal(fake.transformed.length, 1);
  });

  test("fails loudly outside the Workers runtime instead of serving a nonce nobody stamped", () => {
    assert.throws(() => applyScriptNonce(html(), { nonce: "N" }), /HTMLRewriter/);
  });
});
