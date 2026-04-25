import { tryGetServiceClient } from "@/lib/supabase/server";
import type { Article, DailyDigest, Category } from "@/lib/types";

export async function getDigest(date: string): Promise<{ digest: DailyDigest | null; articles: Article[] }> {
  const sb = tryGetServiceClient();
  if (!sb) return { digest: null, articles: [] };
  const [{ data: digest }, { data: articles }] = await Promise.all([
    sb.from("daily_digests").select("*").eq("date", date).maybeSingle(),
    sb.from("articles").select("*").eq("digest_date", date).order("importance", { ascending: false }),
  ]);
  return { digest: (digest as DailyDigest) ?? null, articles: (articles ?? []) as Article[] };
}

export async function getLatestDigest(): Promise<{ digest: DailyDigest | null; articles: Article[] }> {
  const sb = tryGetServiceClient();
  if (!sb) return { digest: null, articles: [] };
  const { data: latest } = await sb
    .from("daily_digests")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return { digest: null, articles: [] };
  return getDigest(latest.date);
}

export async function getArchiveDates(limit = 60): Promise<{ date: string; article_count: number }[]> {
  const sb = tryGetServiceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("daily_digests")
    .select("date, article_count")
    .order("date", { ascending: false })
    .limit(limit);
  return (data ?? []) as { date: string; article_count: number }[];
}

export async function getArticlesByCategory(category: Category, limit = 50): Promise<Article[]> {
  const sb = tryGetServiceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("articles")
    .select("*")
    .eq("category", category)
    .order("digest_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

export async function getRecentArticles(limit = 50): Promise<Article[]> {
  const sb = tryGetServiceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("articles")
    .select("*")
    .order("digest_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}
