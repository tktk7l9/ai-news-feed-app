import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";

async function headersFor(path: string): Promise<Map<string, string>> {
  const rules = await nextConfig.headers!();
  const map = new Map<string, string>();
  for (const rule of rules) {
    if (rule.source !== "/(.*)" && rule.source !== path) continue;
    for (const h of rule.headers) map.set(h.key, h.value);
  }
  return map;
}

function directive(csp: string, name: string): string[] {
  const d = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${name} `) || s === name);
  assert.ok(d, `${name} is set`);
  return d.split(/\s+/).slice(1);
}

test("every response carries the hardening headers", async () => {
  const h = await headersFor("/");
  assert.equal(h.get("X-Content-Type-Options"), "nosniff");
  assert.equal(h.get("X-Frame-Options"), "DENY");
  assert.equal(h.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(h.get("Strict-Transport-Security") ?? "", /max-age=\d{8,}; includeSubDomains; preload/);
  assert.match(h.get("Permissions-Policy") ?? "", /camera=\(\)/);
});

test("the CSP keeps the browser on this origin plus the analytics beacon only", async () => {
  const csp = (await headersFor("/")).get("Content-Security-Policy") ?? "";
  assert.deepEqual(directive(csp, "frame-ancestors"), ["'none'"]);
  assert.deepEqual(directive(csp, "object-src"), ["'none'"]);
  assert.deepEqual(directive(csp, "base-uri"), ["'self'"]);
  assert.deepEqual(directive(csp, "form-action"), ["'self'"]);
  // Supabase and Gemini are server-side only; nothing in the page talks to them.
  assert.deepEqual(directive(csp, "connect-src"), ["'self'", "https://cloudflareinsights.com"]);
  const script = directive(csp, "script-src");
  assert.ok(script.includes("https://static.cloudflareinsights.com"));
  assert.ok(!script.includes("'unsafe-eval'"), "production never evals (tests run with NODE_ENV unset)");
});
