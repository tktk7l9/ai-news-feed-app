import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Retain 90 days of digests, 14 days of raw articles.
const DIGEST_KEEP_DAYS = 90;
const RAW_KEEP_DAYS = 14;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const digestCutoff = new Date(Date.now() - DIGEST_KEEP_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);
  const rawCutoff = new Date(Date.now() - RAW_KEEP_DAYS * 86400_000).toISOString();

  // Delete articles before cascade-deleting digests (no FK between them).
  const { count: articlesDeleted, error: artErr } = await sb
    .from("articles")
    .delete({ count: "exact" })
    .lt("digest_date", digestCutoff);
  if (artErr) return NextResponse.json({ error: artErr.message }, { status: 500 });

  const { count: digestsDeleted, error: digErr } = await sb
    .from("daily_digests")
    .delete({ count: "exact" })
    .lt("date", digestCutoff);
  if (digErr) return NextResponse.json({ error: digErr.message }, { status: 500 });

  // raw_articles cascade-deletes any remaining articles rows.
  const { count: rawDeleted, error: rawErr } = await sb
    .from("raw_articles")
    .delete({ count: "exact" })
    .lt("fetched_at", rawCutoff);
  if (rawErr) return NextResponse.json({ error: rawErr.message }, { status: 500 });

  console.log("[cron] cleanup done", { articlesDeleted, digestsDeleted, rawDeleted });
  return NextResponse.json({ articlesDeleted, digestsDeleted, rawDeleted });
}
