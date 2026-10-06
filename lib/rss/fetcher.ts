import Parser from "rss-parser";
import { Cause, Context, Effect } from "effect";
import type { Source, RawArticle } from "@/lib/types";

const parser = new Parser();

const FETCH_TIMEOUT_MS = 15_000;
const FEED_HEADERS = {
  "User-Agent": "ai-news-feed/1.0 (+https://github.com/tktk7l9/ai-news-feed-app)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
};

const LOOKBACK_MS = 24 * 60 * 60 * 1000;

export type FetchResult = {
  source: Source;
  articles: Omit<RawArticle, "id">[];
  error?: string;
};

type Feed = Awaited<ReturnType<Parser["parseString"]>>;

/**
 * Downloads a feed with fetch() and hands the body to rss-parser. rss-parser's own parseURL
 * reads the raw socket and cannot decompress, so a server that gzips regardless of
 * Accept-Encoding (deepmind.google does) fails on it; fetch decodes transparently and is
 * the native primitive on Cloudflare Workers.
 */
export async function fetchFeed(url: string): Promise<Feed> {
  const res = await fetch(url, {
    headers: FEED_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Status code ${res.status}`);
  return parser.parseString(await res.text());
}

/** Fetches and parses one feed URL. A Context.Reference so tests can stub the network. */
export const ParseFeed = Context.Reference<(url: string) => Promise<Feed>>("ai-news-feed/ParseFeed", {
  defaultValue: () => fetchFeed,
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
