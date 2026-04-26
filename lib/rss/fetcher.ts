import Parser from "rss-parser";
import type { Source, RawArticle } from "@/lib/types";

const parser = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": "ai-news-feed/1.0 (+https://github.com/tktk7l9/ai-news-feed-app)" },
});

const LOOKBACK_MS = 24 * 60 * 60 * 1000;

export type FetchResult = {
  source: Source;
  articles: Omit<RawArticle, "id">[];
  error?: string;
};

export async function fetchAllSources(sources: Source[]): Promise<FetchResult[]> {
  const settled = await Promise.allSettled(sources.map((s) => fetchOne(s)));
  return settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { source: sources[i], articles: [], error: String(r.reason) };
  });
}

async function fetchOne(source: Source): Promise<FetchResult> {
  const { protocol } = new URL(source.feed_url);
  if (protocol !== "https:" && protocol !== "http:") {
    return { source, articles: [], error: `disallowed protocol: ${protocol}` };
  }
  const feed = await parser.parseURL(source.feed_url);
  const cutoff = Date.now() - LOOKBACK_MS;
  const articles: Omit<RawArticle, "id">[] = [];
  for (const item of feed.items ?? []) {
    if (!item.link || !item.title) continue;
    const publishedRaw = item.isoDate ?? item.pubDate;
    const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
    if (publishedAt && publishedAt.getTime() < cutoff) continue;
    const content =
      (item.contentSnippet || item.content || item.summary || "").toString().slice(0, 4000) || null;
    articles.push({
      source_id: source.id,
      url: item.link,
      title: item.title,
      raw_content: content,
      published_at: publishedAt ? publishedAt.toISOString() : null,
    });
  }
  return { source, articles };
}
