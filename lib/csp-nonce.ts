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
// appends after hydration. External scripts get no nonce, so an injected <script src> from any
// other origin stays blocked.
//
// The rewriter cannot tell Next's inline scripts from injected ones, so it nonces every inline
// <script> in the HTML. That is safe only while the server never renders untrusted HTML (no
// dangerouslySetInnerHTML); React escapes everything else.
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
  setAttribute(name: string, value: string): unknown;
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
 * inline <script>. External scripts are left alone ('self' / host sources allow them).
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
        if (!el.hasAttribute("src")) el.setAttribute("nonce", nonce);
      },
    })
    .transform(rewritten);
}
