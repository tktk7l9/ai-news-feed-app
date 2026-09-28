import { tryGetServiceClient } from "@/lib/supabase/server";
import { jstDateString } from "@/lib/date";
import { toLoadError } from "@/lib/load-error";
import type { Article, DailyDigest, Category } from "@/lib/types";

const ENV_MISSING = "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)";

export async function getDigest(
  date: string,
): Promise<{ digest: DailyDigest | null; articles: Article[]; error: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { digest: null, articles: [], error: toLoadError("supabase client", ENV_MISSING) };
  const [digestRes, articlesRes] = await Promise.all([
    sb.from("daily_digests").select("*").eq("date", date).maybeSingle(),
    sb
      .from("articles")
      .select("*")
      .eq("digest_date", date)
      .order("is_model_release", { ascending: false })
      .order("importance", { ascending: false }),
  ]);
  if (digestRes.error) return { digest: null, articles: [], error: toLoadError("digest", digestRes.error) };
  if (articlesRes.error) return { digest: null, articles: [], error: toLoadError("digest articles", articlesRes.error) };
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
  if (!sb) return { digest: null, articles: [], error: toLoadError("supabase client", ENV_MISSING) };
  const { data: latest, error } = await sb
    .from("daily_digests")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { digest: null, articles: [], error: toLoadError("latest digest", error) };
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
  if (!sb) return { dates: [], error: toLoadError("supabase client", ENV_MISSING) };
  const { data, error } = await sb
    .from("daily_digests")
    .select("date, article_count, overview_ja")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) return { dates: [], error: toLoadError("archive dates", error) };
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
  if (!sb) return { articles: [], error: toLoadError("supabase client", ENV_MISSING) };
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .eq("category", category)
    .order("digest_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) return { articles: [], error: toLoadError("category articles", error) };
  return { articles: (data ?? []) as Article[], error: null };
}

export async function getRecentArticles(
  limit = 50,
): Promise<{ articles: Article[]; error: string | null }> {
  const sb = tryGetServiceClient();
  if (!sb) return { articles: [], error: toLoadError("supabase client", ENV_MISSING) };
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .order("digest_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) return { articles: [], error: toLoadError("recent articles", error) };
  return { articles: (data ?? []) as Article[], error: null };
}

export async function getWeeklyCategoryStats(): Promise<{
  stats: { category: Category; count: number }[];
  error: string | null;
}> {
  const sb = tryGetServiceClient();
  if (!sb) return { stats: [], error: toLoadError("supabase client", ENV_MISSING) };
  const since = jstDateString(new Date(Date.now() - 7 * 86400_000));
  const { data, error } = await sb
    .from("articles")
    .select("category")
    .gte("digest_date", since);
  if (error) return { stats: [], error: toLoadError("weekly category stats", error) };
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
  if (!sb) return { articles: [], error: toLoadError("supabase client", ENV_MISSING) };
  const since = jstDateString(new Date(Date.now() - 7 * 86400_000));
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .gte("digest_date", since)
    .gte("importance", 4)
    .order("importance", { ascending: false })
    .order("digest_date", { ascending: false })
    .limit(limit);
  if (error) return { articles: [], error: toLoadError("weekly top articles", error) };
  return { articles: (data ?? []) as Article[], error: null };
}

