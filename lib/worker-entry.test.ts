import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import nextConfig from "../next.config.ts";
import { CSP_HEADER, type Rewriter, type ScriptElement } from "./csp-nonce.ts";

// Guards the Worker entry. Pointing wrangler's "main" back at the generated .open-next/worker.js
// would still deploy and serve every page, but silently restore script-src 'unsafe-inline' (and
// drop the Cron Triggers handler), so both the config and the entry's behaviour are pinned here.
// All async setup runs before the first test() so the after() hook cannot fire early.

const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");

// worker.js imports .open-next/worker.js, which exists only after `opennextjs-cloudflare build`.
// Swap it for a stand-in whose fetch the tests control.
type Handler = (request: Request) => Response;
const state: { handler: Handler } = {
  handler: () => {
    throw new Error("no handler set");
  },
};
(globalThis as { __openNextFetch?: Handler }).__openNextFetch = (request) => state.handler(request);
const FAKE_OPEN_NEXT = `data:text/javascript,${encodeURIComponent(`
  export default { fetch: async (request) => globalThis.__openNextFetch(request) };
  export class DOQueueHandler {}
  export class DOShardedTagCache {}
  export class BucketCachePurge {}
`)}`;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./.open-next/worker.js") return { url: FAKE_OPEN_NEXT, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

/**
 * A small stand-in for the Workers HTMLRewriter: runs the element handlers on every <script>
 * start tag of the body. Enough for markup these tests write themselves.
 */
class TagRewriter implements Rewriter {
  private handlers: ((el: ScriptElement) => void)[] = [];
  on(selector: string, handlers: { element(el: ScriptElement): void }): Rewriter {
    assert.equal(selector, "script");
    this.handlers.push((el) => handlers.element(el));
    return this;
  }
  transform(response: Response): Response {
    const body = response.text().then((text) =>
      text.replace(/<script\b([^>]*)>/g, (_tag, raw: string) => {
        const attrs = new Map([...raw.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map((m) => [m[1], m[2] ?? ""]));
        const el: ScriptElement = {
          hasAttribute: (name) => attrs.has(name),
          getAttribute: (name) => attrs.get(name) ?? null,
          setAttribute: (name, value) => attrs.set(name, value),
        };
        for (const handler of this.handlers) handler(el);
        return `<script${[...attrs].map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${v}"`)).join("")}>`;
      }),
    );
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode(await body));
        controller.close();
      },
    });
    return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
}
(globalThis as { HTMLRewriter?: unknown }).HTMLRewriter = TagRewriter;

const entry = (await import(new URL("../worker.js", import.meta.url).href)) as {
  default: { fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> };
  DOQueueHandler: unknown;
  DOShardedTagCache: unknown;
  BucketCachePurge: unknown;
};

const STATIC_CSP = (await nextConfig.headers!())
  .flatMap((r) => r.headers)
  .find((h) => h.key === CSP_HEADER)!.value;

after(() => {
  hooks.deregister();
  delete (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter;
  delete (globalThis as { __openNextFetch?: unknown }).__openNextFetch;
});

// Shaped like a Next App Router page (inline RSC payload scripts plus an external chunk), with a
// data block and two SVG external scripts that must not get the nonce either.
const PAGE = [
  "<!DOCTYPE html><html><head>",
  '<script src="/_next/static/chunks/main.js" async></script>',
  '<script type="application/ld+json">{"@type":"WebSite"}</script>',
  "</head><body><main>本文</main>",
  '<svg><script href="https://evil.example/a.js"></script><script xlink:href="https://evil.example/b.js"></script></svg>',
  "<script>(self.__next_f=self.__next_f||[]).push([0])</script>",
  '<script>self.__next_f.push([1,"payload"])</script>',
  "</body></html>",
].join("");
const INLINE_JS = 2;

async function get(path: string, response: () => Response) {
  state.handler = response;
  return entry.default.fetch(new Request(`https://example.test${path}`), {}, {});
}

function htmlResponse(status: number) {
  return new Response(PAGE, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", [CSP_HEADER]: STATIC_CSP, etag: '"abc"' },
  });
}

test("wrangler main is the worker.js wrapper, not the generated OpenNext worker", () => {
  const mains = [...wrangler.matchAll(/"main"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(mains, ["worker.js"]);
});

test("every HTML page gets a fresh nonce in the CSP and on each inline JavaScript script only", async () => {
  const nonces = new Set<string>();
  for (const status of [200, 404, 200]) {
    const res = await get("/", () => htmlResponse(status));
    assert.equal(res.status, status);
    const csp = res.headers.get(CSP_HEADER) ?? "";
    const nonce = /script-src 'self' 'nonce-([A-Za-z0-9+/=]+)' https:\/\/static\.cloudflareinsights\.com;/.exec(csp)?.[1];
    assert.ok(nonce, csp);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
    assert.equal(res.headers.get("etag"), null);
    nonces.add(nonce);

    const body = await res.text();
    const scripts = [...body.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    assert.equal(scripts.length, 6);
    const stamped = scripts.filter((tag) => tag.includes(` nonce="${nonce}"`));
    assert.equal(stamped.length, INLINE_JS);
    for (const tag of stamped) assert.match(tag, /^<script nonce="[^"]+">$/, "only the bare inline scripts");
    for (const tag of scripts.filter((t) => /\s(src|href|xlink:href|type)=/.test(t))) {
      assert.ok(!tag.includes("nonce="), tag);
    }
  }
  assert.equal(nonces.size, 3, "a nonce is never reused across requests");
});

test("non-HTML responses keep the static header untouched", async () => {
  const json = new Response("{}", { headers: { "content-type": "application/json", [CSP_HEADER]: STATIC_CSP } });
  const res = await get("/manifest.webmanifest", () => json);
  assert.equal(res, json);
});

test("worker.js still re-exports the Durable Object classes of the generated worker", () => {
  for (const name of ["DOQueueHandler", "DOShardedTagCache", "BucketCachePurge"] as const) {
    assert.equal(typeof entry[name], "function", name);
  }
});
