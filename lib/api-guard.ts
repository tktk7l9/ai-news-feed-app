import { NextRequest } from "next/server";

// Abuse guards for endpoints that must stay callable from the app's own UI
// without a login (e.g. lazy TTS generation). Not authentication — the goal
// is to make quota/cost abuse impractical, not impossible.

/**
 * True when the request plausibly originates from this app's own pages.
 * Primary signal is `Sec-Fetch-Site: same-origin` (sent by all modern
 * browsers, absent from curl/scripts). Falls back to comparing the
 * Origin/Referer host with the request host. Requests with neither signal
 * are rejected.
 */
export function isSameOriginRequest(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";

  const host = req.headers.get("host");
  if (!host) return false;
  for (const name of ["origin", "referer"] as const) {
    const value = req.headers.get(name);
    if (!value) continue;
    try {
      return new URL(value).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

type Bucket = { count: number; resetAt: number };

// Fixed-window counters. In-memory なのでサーバレスではインスタンス単位の
// 制限になるが、単一インスタンスに集中する連打・スクリプト乱用には効く。
const buckets = new Map<string, Bucket>();

function take(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult = { ok: true } | { ok: false; reason: string };

/**
 * Per-IP + global fixed-window rate limit. The global cap protects the
 * upstream quota (Gemini TTS free tier is 10 RPM) even when requests come
 * from many IPs.
 */
export function checkRateLimit(
  req: NextRequest,
  scope: string,
  { perIpPerMinute, globalPerMinute }: { perIpPerMinute: number; globalPerMinute: number },
): RateLimitResult {
  const windowMs = 60_000;
  if (!take(`${scope}:global`, globalPerMinute, windowMs)) {
    return { ok: false, reason: "global rate limit exceeded" };
  }
  if (!take(`${scope}:ip:${clientIp(req)}`, perIpPerMinute, windowMs)) {
    return { ok: false, reason: "per-ip rate limit exceeded" };
  }
  return { ok: true };
}
