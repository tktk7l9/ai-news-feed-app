import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase/server";
import { fetchAllSources } from "@/lib/rss/fetcher";
import { filterAndCap } from "@/lib/rss/filter";
import { generateDigest, type DigestInput } from "@/lib/gemini/digest";
import { jstDateString } from "@/lib/date";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  try {
    const result = await runDailyDigest();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron] daily-digest failed", e);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}

async function runDailyDigest() {
  const sb = getServiceClient();
  const today = jstDateString();

  // 1. Load active sources
  const { data: sources, error: srcErr } = await sb
    .from("sources")
    .select("*")
    .eq("is_active", true);
  if (srcErr) throw srcErr;
  if (!sources || sources.length === 0) throw new Error("no active sources");

  // 2. Fetch RSS in parallel
  const fetchResults = await fetchAllSources(sources as Source[]);
  const allFresh = fetchResults.flatMap((r) => r.articles);
  const failures = fetchResults.filter((r) => r.error);
  if (failures.length) {
    console.warn("[cron] some sources failed", failures.map((f) => ({ name: f.source.name, err: f.error })));
  }

  // 3. Upsert raw_articles
  if (allFresh.length > 0) {
    const { error: upErr } = await sb
      .from("raw_articles")
      .upsert(allFresh, { onConflict: "url", ignoreDuplicates: true });
    if (upErr) throw upErr;
  }

  // 4. Pull unprocessed articles from the last 24h with source name
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: candidates, error: candErr } = await sb
    .from("raw_articles")
    .select("id, url, title, raw_content, published_at, source_id, sources(name, weight)")
    .eq("is_processed", false)
    .gte("fetched_at", since)
    .limit(120);
  if (candErr) throw candErr;

  // 5. AI keyword filter + cap
  const filtered = filterAndCap(
    (candidates ?? []).map((c) => ({
      ...c,
      source_name: (c as { sources?: { name?: string } }).sources?.name ?? "unknown",
    })),
    60,
  );

  if (filtered.length === 0) {
    console.log("[cron] no candidates after filter");
    return { date: today, processed: 0, accepted: 0 };
  }

  // 6. Send batch to Claude
  const digestInputs: DigestInput[] = filtered.map((c) => ({
    raw_id: c.id,
    source_name: c.source_name,
    title: c.title,
    url: c.url,
    raw_content: c.raw_content,
  }));
  const digest = await generateDigest(digestInputs);

  // 7. Pick accepted, sort by importance, cap 15
  const accepted = digest.articles
    .filter((a) => a.should_include && a.importance >= 3)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  const inputById = new Map(filtered.map((c) => [c.id, c]));
  const articleRows = accepted
    .map((a) => {
      const src = inputById.get(a.raw_id);
      if (!src) return null;
      return {
        raw_article_id: a.raw_id,
        digest_date: today,
        title_ja: a.title_ja,
        summary_ja: a.summary_ja,
        category: a.category,
        importance: a.importance,
        is_model_release: a.is_model_release ?? false,
        url: src.url,
        source_name: src.source_name,
        published_at: src.published_at,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // 8. Persist
  if (articleRows.length > 0) {
    const { error: artErr } = await sb
      .from("articles")
      .upsert(articleRows, { onConflict: "raw_article_id", ignoreDuplicates: true });
    if (artErr) throw artErr;
  }

  const { error: digErr } = await sb.from("daily_digests").upsert({
    date: today,
    overview_ja: digest.overview_ja,
    article_count: articleRows.length,
    generated_at: new Date().toISOString(),
  });
  if (digErr) throw digErr;

  // mark processed for ALL filtered candidates (even non-accepted) so we don't reprocess
  const processedIds = filtered.map((c) => c.id);
  if (processedIds.length > 0) {
    const { error: procErr } = await sb
      .from("raw_articles")
      .update({ is_processed: true })
      .in("id", processedIds);
    if (procErr) throw procErr;
  }

  // 9. Revalidate ISR pages
  try {
    revalidatePath("/");
    revalidatePath("/archive");
    revalidatePath(`/archive/${today}`);
  } catch (e) {
    console.warn("[cron] revalidate failed", e);
  }

  return {
    date: today,
    sources: sources.length,
    failures: failures.length,
    fetched: allFresh.length,
    candidates: filtered.length,
    accepted: articleRows.length,
  };
}
