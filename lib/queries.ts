import { tryGetServiceClient } from "@/lib/supabase/server";
import { jstDateString } from "@/lib/date";
import { unstable_cache } from "next/cache";
import { createErrorCacheShortener } from "@/lib/error-cache";
import { toLoadError } from "@/lib/load-error";
import type { Article, DailyDigest, Category } from "@/lib/types";

const ENV_MISSING = "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)";

const shortenPageCacheAfterError = createErrorCacheShortener(unstable_cache);

// Every failed load logs the detail, keeps the rendered page short-lived, and returns the
// user-facing message (SHIG 55, 11).
async function loadFailed(context: string, err: unknown): Promise<string> {
  await shortenPageCacheAfterError();
  return toLoadError(context, err);
}

export async function getDigest(
  date: string,
): Promise<{ digest: DailyDigest | null; articles: Article[]; error: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { digest: null, articles: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const [digestRes, articlesRes] = await Promise.all([
    sb.from("daily_digests").select("*").eq("date", date).maybeSingle(),
    sb
      .from("articles")
      .select("*")
      .eq("digest_date", date)
      .order("is_model_release", { ascending: false })
      .order("importance", { ascending: false }),
  ]);
  if (digestRes.error) return { digest: null, articles: [], error: await loadFailed("digest", digestRes.error) };
  if (articlesRes.error) return { digest: null, articles: [], error: await loadFailed("digest articles", articlesRes.error) };
  return {
    digest: (digestRes.data as DailyDigest) ?? null,
    articles: (articlesRes.data ?? []) as Article[],
    error: null,
  };
}

export async function getLatestDigest(): Promise<{
  digest: DailyDigest | null;
  articles: Article[];
  error: string | null;
}> {
  const sb = tryGetServiceClient();
  if (!sb) return { digest: null, articles: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const { data: latest, error } = await sb
    .from("daily_digests")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { digest: null, articles: [], error: await loadFailed("latest digest", error) };
  if (!latest) return { digest: null, articles: [], error: null };
  return getDigest(latest.date);
}

export async function getArchiveDates(
  limit = 60,
): Promise<{
  dates: { date: string; article_count: number; overview_ja: string }[];
  error: string | null;
}> {
  const sb = tryGetServiceClient();
  if (!sb) return { dates: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const { data, error } = await sb
    .from("daily_digests")
    .select("date, article_count, overview_ja")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) return { dates: [], error: await loadFailed("archive dates", error) };
  return {
    dates: (data ?? []) as { date: string; article_count: number; overview_ja: string }[],
    error: null,
  };
}

export async function getArticlesByCategory(
  category: Category,
  limit = 50,
): Promise<{ articles: Article[]; error: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { articles: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .eq("category", category)
    .order("digest_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) return { articles: [], error: await loadFailed("category articles", error) };
  return { articles: (data ?? []) as Article[], error: null };
}

export async function getRecentArticles(
  limit = 50,
): Promise<{ articles: Article[]; error: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { articles: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .order("digest_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) return { articles: [], error: await loadFailed("recent articles", error) };
  return { articles: (data ?? []) as Article[], error: null };
}

export async function getWeeklyCategoryStats(): Promise<{
  stats: { category: Category; count: number }[];
  error: string | null;
}> {
  const sb = tryGetServiceClient();
  if (!sb) return { stats: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const since = jstDateString(new Date(Date.now() - 7 * 86400_000));
  const { data, error } = await sb
    .from("articles")
    .select("category")
    .gte("digest_date", since);
  if (error) return { stats: [], error: await loadFailed("weekly category stats", error) };
  if (!data) return { stats: [], error: null };
  const counts = new Map<Category, number>();
  for (const { category } of data) {
    counts.set(category as Category, (counts.get(category as Category) ?? 0) + 1);
  }
  return {
    stats: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    error: null,
  };
}

export async function getWeeklyTopArticles(
  limit = 5,
): Promise<{ articles: Article[]; error: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { articles: [], error: await loadFailed("supabase client", ENV_MISSING) };
  const since = jstDateString(new Date(Date.now() - 7 * 86400_000));
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .gte("digest_date", since)
    .gte("importance", 4)
    .order("importance", { ascending: false })
    .order("digest_date", { ascending: false })
    .limit(limit);
  if (error) return { articles: [], error: await loadFailed("weekly top articles", error) };
  return { articles: (data ?? []) as Article[], error: null };
}

// Nearest existing digests before and after `date`, for day-to-day paging (SHIG 41, 81).
export async function getAdjacentDigestDates(
  date: string,
): Promise<{ prev: string | null; next: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { prev: null, next: null };
  const [prevRes, nextRes] = await Promise.all([
    sb.from("daily_digests").select("date").lt("date", date).order("date", { ascending: false }).limit(1),
    sb.from("daily_digests").select("date").gt("date", date).order("date", { ascending: true }).limit(1),
  ]);
  // Paging links are optional; a failure here should not hide the digest itself.
  if (prevRes.error) await loadFailed("previous digest", prevRes.error);
  if (nextRes.error) await loadFailed("next digest", nextRes.error);
  return {
    prev: (prevRes.data?.[0] as { date: string } | undefined)?.date ?? null,
    next: (nextRes.data?.[0] as { date: string } | undefined)?.date ?? null,
  };
}
