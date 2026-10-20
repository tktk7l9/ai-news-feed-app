import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import nextConfig from "../next.config.ts";
import {
  BROWSER_CACHE_CONTROL,
  CACHE_CONTROL_HEADER,
  CSP_HEADER,
  type Rewriter,
  type ScriptElement,
} from "./csp-nonce.ts";

// Guards the Worker entry. Pointing wrangler's "main" back at the generated .open-next/worker.js
// would still deploy and serve every page, but silently restore script-src 'unsafe-inline' and
// Next's CDN-only Cache-Control in browsers (and drop the Cron Triggers handler), so both the
// config and the entry's behaviour are pinned here.
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

type Ctx = { waitUntil(promise: Promise<unknown>): void };
const entry = (await import(new URL("../worker.js", import.meta.url).href)) as {
  default: {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
    scheduled(controller: { cron: string }, env: { CRON_SECRET: string }, ctx: Ctx): Promise<void>;
  };
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

function htmlResponse(status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(PAGE, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", [CSP_HEADER]: STATIC_CSP, etag: '"abc"', ...extraHeaders },
  });
}

// What Next 16 sends for an ISR page (revalidate = 3600, default one-year expire) and its RSC payload.
const NEXT_ISR_CACHE_CONTROL = "s-maxage=3600, stale-while-revalidate=31532400";

test("wrangler main is the worker.js wrapper, not the generated OpenNext worker", () => {
  const mains = [...wrangler.matchAll(/"main"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(mains, ["worker.js"]);
});

// The ISR pages (revalidate = 3600) are stored in R2, regenerated through a Durable Object
// queue, and revalidated by the daily digest through a Durable Object tag cache
// (open-next.config.ts). Dropping one of these bindings would not fail the build: every request
// would quietly render again (R2), stale pages would never regenerate (queue), or the morning's
// digest would wait behind the page cached before it (tag cache).
test("wrangler binds the ISR cache: R2 bucket, Durable Object queue, tag cache and the self reference", () => {
  assert.match(wrangler, /"binding"\s*:\s*"NEXT_INC_CACHE_R2_BUCKET"/);
  assert.match(wrangler, /"name"\s*:\s*"NEXT_CACHE_DO_QUEUE"\s*,\s*"class_name"\s*:\s*"DOQueueHandler"/);
  assert.match(wrangler, /"name"\s*:\s*"NEXT_TAG_CACHE_DO_SHARDED"\s*,\s*"class_name"\s*:\s*"DOShardedTagCache"/);
  // A deployed migration tag must never change, so the tag cache class arrives as v2.
  assert.match(wrangler, /"tag"\s*:\s*"v1"\s*,\s*"new_sqlite_classes"\s*:\s*\[\s*"DOQueueHandler"\s*\]/);
  assert.match(wrangler, /"tag"\s*:\s*"v2"\s*,\s*"new_sqlite_classes"\s*:\s*\[\s*"DOShardedTagCache"\s*\]/);
  assert.match(wrangler, /"binding"\s*:\s*"WORKER_SELF_REFERENCE"\s*,\s*"service"\s*:\s*"ai-news-feed-app"/);
  assert.match(wrangler, /"name"\s*:\s*"ai-news-feed-app"/);
  // The Durable Object classes must be exported from the entry wrangler runs
  const entry = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
  assert.match(entry, /export \{ DOQueueHandler \} from "\.\/\.open-next\/worker\.js"/);
  assert.match(entry, /export \{ DOShardedTagCache \} from "\.\/\.open-next\/worker\.js"/);
  const openNextConfig = readFileSync(new URL("../open-next.config.ts", import.meta.url), "utf8");
  assert.match(openNextConfig, /incrementalCache:\s*withRegionalCache\(r2IncrementalCache/);
  assert.match(openNextConfig, /queue:\s*doQueue/);
  assert.match(openNextConfig, /tagCache:\s*doShardedTagCache\(/);
  // The digest's revalidatePath calls are what the tag cache is for.
  const digest = readFileSync(new URL("./jobs/digest.ts", import.meta.url), "utf8");
  for (const path of ['"/"', '"/archive"', '"/archive/[date]", "page"', '"/category/[slug]", "page"']) {
    assert.ok(digest.includes(`revalidatePath(${path})`), path);
  }
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

test("an HTML page with Next's CDN Cache-Control reaches the browser revalidating, still with its nonce", async () => {
  const res = await get("/", () => htmlResponse(200, { [CACHE_CONTROL_HEADER]: NEXT_ISR_CACHE_CONTROL }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get(CACHE_CONTROL_HEADER), BROWSER_CACHE_CONTROL);

  const csp = res.headers.get(CSP_HEADER) ?? "";
  const nonce = /script-src 'self' 'nonce-([A-Za-z0-9+/=]+)'/.exec(csp)?.[1];
  assert.ok(nonce, csp);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  const body = await res.text();
  assert.equal(body.split(` nonce="${nonce}"`).length - 1, INLINE_JS);
});

test("RSC payloads and route handlers with Next's CDN Cache-Control reach the browser revalidating", async () => {
  const cases: { path: string; contentType: string; cacheControl: string; body: string }[] = [
    { path: "/?_rsc=abc12", contentType: "text/x-component", cacheControl: NEXT_ISR_CACHE_CONTROL, body: "0:[]" },
    { path: "/manifest.webmanifest", contentType: "application/manifest+json", cacheControl: "s-maxage=31536000", body: "{}" },
  ];
  for (const { path, contentType, cacheControl, body } of cases) {
    const res = await get(path, () =>
      new Response(body, {
        headers: { "content-type": contentType, [CACHE_CONTROL_HEADER]: cacheControl, [CSP_HEADER]: STATIC_CSP },
      }),
    );
    assert.equal(res.headers.get(CACHE_CONTROL_HEADER), BROWSER_CACHE_CONTROL, path);
    assert.equal(res.headers.get("content-type"), contentType, path);
    // Not HTML, so the CSP stays the static one (no nonce).
    assert.equal(res.headers.get(CSP_HEADER), STATIC_CSP, path);
    assert.equal(await res.text(), body, path);
  }
});

test("a response without Cache-Control gets none", async () => {
  const json = await get("/api/cron/cleanup", () =>
    new Response("{}", { headers: { "content-type": "application/json" } }),
  );
  assert.equal(json.headers.get(CACHE_CONTROL_HEADER), null);

  const html = await get("/", () => htmlResponse(200));
  assert.equal(html.headers.get(CACHE_CONTROL_HEADER), null);
  assert.match(html.headers.get(CSP_HEADER) ?? "", /'nonce-/);
});

/** Fires one Cron Trigger and waits for its work, returning the requests it made and its logs. */
async function fireCron(cron: string, respond: (path: string) => Response = () => Response.json({ ok: true })) {
  const requests: { path: string; authorization: string | null }[] = [];
  state.handler = (request) => {
    const path = new URL(request.url).pathname;
    requests.push({ path, authorization: request.headers.get("authorization") });
    return respond(path);
  };
  const pending: Promise<unknown>[] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  const original = { log: console.log, error: console.error };
  console.log = (...args: unknown[]) => logs.push(args.join(" "));
  console.error = (...args: unknown[]) => errors.push(args.map(String).join(" "));
  try {
    await entry.default.scheduled({ cron }, { CRON_SECRET: "s3cret" }, { waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
  } finally {
    Object.assign(console, original);
  }
  return { requests, logs, errors };
}

test("every schedule in wrangler.jsonc is handled by worker.js", async () => {
  const crons = [...wrangler.matchAll(/^\s*"([^"]+)",\s*\/\/ /gm)].map((m) => m[1]).filter((c) => c.split(" ").length === 5);
  assert.deepEqual(crons, ["0 21 * * *", "0 4 * * *"]);
  for (const cron of crons) {
    const { requests, errors } = await fireCron(cron);
    assert.ok(requests.length > 0, cron);
    assert.deepEqual(errors, [], cron);
  }
});

test("the morning cron builds the digest; the afternoon cron cleans up, then retries a missing digest", async () => {
  const morning = await fireCron("0 21 * * *");
  assert.deepEqual(morning.requests, [{ path: "/api/cron/daily-digest", authorization: "Bearer s3cret" }]);

  const afternoon = await fireCron("0 4 * * *");
  assert.deepEqual(
    afternoon.requests.map((r) => r.path),
    ["/api/cron/cleanup", "/api/cron/daily-digest"],
    "cleanup first, then the digest catch-up (a no-op once today's digest exists)",
  );
  for (const r of afternoon.requests) assert.equal(r.authorization, "Bearer s3cret");
  // The route's JSON summary is logged, so a skipped or failed run is visible in Workers Logs.
  assert.ok(afternoon.logs.includes('[cron] /api/cron/cleanup -> 200 {"ok":true}'), afternoon.logs.join("\n"));
});

test("a failing cron route is logged and does not stop the next one", async () => {
  const { requests, logs, errors } = await fireCron("0 4 * * *", (path) => {
    if (path === "/api/cron/cleanup") throw new Error("boom");
    return Response.json({ date: "2026-10-20", skipped: true, accepted: 0 }, { status: 200 });
  });
  assert.deepEqual(requests.map((r) => r.path), ["/api/cron/cleanup", "/api/cron/daily-digest"]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^\[cron\] \/api\/cron\/cleanup failed Error: boom/);
  assert.ok(logs.some((l) => l.startsWith("[cron] /api/cron/daily-digest -> 200") && l.includes('"skipped":true')));
});

test("an unknown schedule runs nothing", async () => {
  const { requests, errors } = await fireCron("*/5 * * * *");
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, ["[cron] unknown schedule: */5 * * * *"]);
});

test("worker.js still re-exports the Durable Object classes of the generated worker", () => {
  for (const name of ["DOQueueHandler", "DOShardedTagCache", "BucketCachePurge"] as const) {
    assert.equal(typeof entry[name], "function", name);
  }
});
