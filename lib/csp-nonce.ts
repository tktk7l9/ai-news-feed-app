// Per-request script nonce for HTML responses, applied by the Worker entry (worker.js).
//
// next.config.ts headers() serve a static CSP whose script-src has 'unsafe-inline', because Next
// writes its RSC payload as inline <script> (self.__next_f.push) and the payload differs on every
// render, so hashes cannot be precomputed. Next 16's proxy (the usual nonce source) runs only on
// the Node runtime and OpenNext cannot run it. Every HTML response does pass through the Worker,
// though, so the Worker swaps 'unsafe-inline' in script-src for a fresh nonce and stamps that nonce
// on each inline <script> with HTMLRewriter (streaming, no buffering).
//
// 'strict-dynamic' is deliberately NOT added: 'self' keeps allowing the /_next/static chunks and
// the host source keeps allowing the Cloudflare Web Analytics beacon that components/Analytics.tsx
// appends after hydration. Only inline JavaScript gets the nonce (isInlineJavaScript): an external
// script (`src`, or `href` / `xlink:href` on an SVG <script>) never does, so an injected one from
// any other origin stays blocked, and data blocks (JSON-LD, templates) need none.
//
// Trust boundary: the rewriter cannot tell Next's inline scripts from injected ones, so every
// inline JavaScript <script> in the HTML gets the nonce. That is safe only while the server never
// renders untrusted HTML. News titles, summaries and source names come from external RSS feeds and
// Gemini, so they must stay React text (escaped): no dangerouslySetInnerHTML or other raw-HTML sink
// (lib/raw-html-sinks.test.ts fails on one), and app/hostile-feed-text.test.tsx renders the news
// pages with hostile feed text to prove it comes out escaped.
//
// Responses that are not HTML (RSC, JSON, images) keep the static header unchanged; they run no
// inline script. `next dev` / `next start` never reach this code and keep the static CSP.

export const CSP_HEADER = "Content-Security-Policy";

/** 128 random bits, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Replaces 'unsafe-inline' in the script-src directive with 'nonce-<nonce>'.
 * Returns null when script-src has no 'unsafe-inline' (nothing to tighten), so the caller
 * leaves the response untouched instead of stamping nonces nobody checks.
 */
export function withScriptNonce(policy: string, nonce: string): string | null {
  let replaced = false;
  const directives = policy.split(";").map((directive) => {
    const tokens = directive.trim().split(/\s+/);
    if (tokens[0] !== "script-src" || !tokens.includes("'unsafe-inline'")) return directive;
    replaced = true;
    const rewritten = tokens.map((t) => (t === "'unsafe-inline'" ? `'nonce-${nonce}'` : t)).join(" ");
    // Keep the original leading space so the joined policy reads the same as the input.
    return directive.startsWith(" ") ? ` ${rewritten}` : rewritten;
  });
  return replaced ? directives.join(";") : null;
}

/** The subset of Cloudflare's HTMLRewriter used here (no workers-types dependency). */
export interface ScriptElement {
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): unknown;
}

// The JavaScript MIME type essences (WHATWG MIME Sniffing). A <script> whose type is one of them
// runs as a classic script; "module" runs as a module script; any other type is a data block.
const JAVASCRIPT_MIME_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
]);

const asciiLowerCase = (value: string) => value.replace(/[A-Z]/g, (c) => c.toLowerCase());
const stripAsciiWhitespace = (value: string) => value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");

/**
 * Whether a <script> is inline JavaScript that needs the nonce to run, following the type rules
 * of the HTML "prepare the script element" steps. No nonce for:
 * - external scripts: `src`, or `href` / `xlink:href`, which an SVG <script> uses instead of `src`
 *   ('self' and the host sources decide those, so an injected one from elsewhere stays blocked);
 * - data blocks, import maps and speculation rules: any type other than absent, empty, a
 *   JavaScript MIME type or "module" (compared after trimming ASCII whitespace, ASCII
 *   case-insensitively);
 * - the legacy `language` attribute without a type: Next never emits it, so it fails closed.
 * HTMLRewriter hands over attribute values undecoded; an entity-encoded type therefore reads as a
 * data block, which can only leave a script blocked, never wrongly allowed.
 */
export function isInlineJavaScript(el: ScriptElement): boolean {
  if (el.hasAttribute("src") || el.hasAttribute("href") || el.hasAttribute("xlink:href")) return false;
  const type = el.getAttribute("type");
  if (type === null) return !el.getAttribute("language");
  if (type === "") return true;
  const essence = asciiLowerCase(stripAsciiWhitespace(type));
  return essence === "module" || JAVASCRIPT_MIME_TYPES.has(essence);
}
export interface Rewriter {
  on(selector: string, handlers: { element(el: ScriptElement): void }): Rewriter;
  transform(response: Response): Response;
}

function workersRewriter(): Rewriter {
  const ctor = (globalThis as { HTMLRewriter?: new () => Rewriter }).HTMLRewriter;
  if (!ctor) throw new Error("HTMLRewriter is not available outside the Workers runtime");
  return new ctor();
}

/**
 * Tightens the CSP of an HTML response to a per-request nonce and stamps that nonce on every
 * inline JavaScript <script> (isInlineJavaScript). External scripts and data blocks are left alone.
 * Exactly one CSP header is kept: the static one is replaced, never appended to.
 */
export function applyScriptNonce(
  response: Response,
  { nonce = createNonce(), rewriter = workersRewriter }: { nonce?: string; rewriter?: () => Rewriter } = {},
): Response {
  if (!response.body) return response;
  if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")) {
    return response;
  }
  const policy = response.headers.get(CSP_HEADER);
  const tightened = policy === null ? null : withScriptNonce(policy, nonce);
  if (tightened === null) return response;

  const headers = new Headers(response.headers);
  headers.set(CSP_HEADER, tightened);
  // The body now differs per request: a validator would let a 304 pair an old body
  // (old nonce) with a new header (new nonce) and block every inline script.
  headers.delete("etag");
  headers.delete("content-length");

  const rewritten = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  return rewriter()
    .on("script", {
      element(el) {
        if (isInlineJavaScript(el)) el.setAttribute("nonce", nonce);
      },
    })
    .transform(rewritten);
}
