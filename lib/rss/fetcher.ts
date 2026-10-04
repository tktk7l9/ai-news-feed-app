import Parser from "rss-parser";
import { Cause, Context, Effect } from "effect";
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

type Feed = Awaited<ReturnType<Parser["parseURL"]>>;

/** Fetches and parses one feed URL. A Context.Reference so tests can stub the network. */
export const ParseFeed = Context.Reference<(url: string) => Promise<Feed>>("ai-news-feed/ParseFeed", {
  defaultValue: () => (url) => parser.parseURL(url),
});

/**
 * Fetches every source in parallel. Never fails: a source that cannot be fetched becomes a
 * result with `error` set, so one broken feed does not stop the digest.
 */
export const fetchAllSources = (sources: Source[]): Effect.Effect<FetchResult[]> =>
  Effect.forEach(
    sources,
    (source) =>
      fetchOne(source).pipe(
        Effect.catchCause((cause) =>
          // Same text as String(reason) of the old Promise.allSettled version, so logs stay comparable
          Effect.succeed<FetchResult>({ source, articles: [], error: String(Cause.squash(cause)) }),
        ),
      ),
    { concurrency: "unbounded" },
  );

const fetchOne = (source: Source): Effect.Effect<FetchResult, unknown> =>
  Effect.gen(function* () {
    const { protocol } = new URL(source.feed_url);
    if (protocol !== "https:" && protocol !== "http:") {
      return { source, articles: [], error: `disallowed protocol: ${protocol}` };
    }
    const parseFeed = yield* ParseFeed;
    const feed = yield* Effect.tryPromise({ try: () => parseFeed(source.feed_url), catch: (e) => e });
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
  });
