import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DIGEST_KEEP_DAYS = 90;
const RAW_KEEP_DAYS = 14;

function verifyBearerToken(provided: string | null, secret: string): boolean {
  if (!provided) return false;
  const expected = `Bearer ${secret}`;
  const key = randomBytes(32);
  const a = createHmac("sha256", key).update(provided).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !verifyBearerToken(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const digestCutoff = new Date(Date.now() - DIGEST_KEEP_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);
  const rawCutoff = new Date(Date.now() - RAW_KEEP_DAYS * 86400_000).toISOString();

  const { count: articlesDeleted, error: artErr } = await sb
    .from("articles")
    .delete({ count: "exact" })
    .lt("digest_date", digestCutoff);
  if (artErr) {
    console.error("[cron] cleanup: articles delete failed", artErr);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  const { count: digestsDeleted, error: digErr } = await sb
    .from("daily_digests")
    .delete({ count: "exact" })
    .lt("date", digestCutoff);
  if (digErr) {
    console.error("[cron] cleanup: digests delete failed", digErr);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  const { count: rawDeleted, error: rawErr } = await sb
    .from("raw_articles")
    .delete({ count: "exact" })
    .lt("fetched_at", rawCutoff);
  if (rawErr) {
    console.error("[cron] cleanup: raw_articles delete failed", rawErr);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  console.log("[cron] cleanup done", { articlesDeleted, digestsDeleted, rawDeleted });
  return NextResponse.json({ articlesDeleted, digestsDeleted, rawDeleted });
}
