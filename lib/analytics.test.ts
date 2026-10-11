import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";
import { BEACON_SRC, BEACON_TOKEN } from "./analytics.ts";
import { CSP_HEADER, withScriptNonce } from "./csp-nonce.ts";

const STATIC_CSP = (await nextConfig.headers!())
  .flatMap((r) => r.headers)
  .find((h) => h.key === CSP_HEADER)!.value;

test("the beacon loads from an origin script-src allows, before and after the Worker adds the nonce", () => {
  // Without 'strict-dynamic' an appended script is allowed by its origin, so a mismatch here only
  // blocks the beacon, silently (a CSP violation in the console).
  const origin = new URL(BEACON_SRC).origin;
  for (const policy of [STATIC_CSP, withScriptNonce(STATIC_CSP, "n")!]) {
    assert.match(policy, new RegExp(`script-src [^;]*${origin}( |;|$)`));
    assert.match(policy, /connect-src [^;]*https:\/\/cloudflareinsights\.com( |;|$)/);
  }
});

test("the site token is a 32-digit hex", () => {
  assert.match(BEACON_TOKEN, /^[0-9a-f]{32}$/);
});
