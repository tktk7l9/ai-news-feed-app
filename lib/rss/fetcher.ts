import Parser from "rss-parser";
import { Cause, Context, Effect } from "effect";
import { isHttpUrl } from "../url.ts";
import type { Source, RawArticle } from "@/lib/types";

const parser = new Parser();

const FETCH_TIMEOUT_MS = 15_000;
/**
 * Upper bound on one feed body. The largest real feed (arXiv cs.AI, ~400 items) is under 1 MB;
 * without a cap a hijacked or misconfigured feed could stream until the Worker runs out of memory.
 */
export const MAX_FEED_BYTES = 8 * 1024 * 1024;
/** Titles longer than this are cut before storage; raw_content is already cut at 4000. */
const MAX_TITLE_CHARS = 500;
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
  return parser.parseString(await readTextCapped(res, MAX_FEED_BYTES));
}

/**
 * res.text() with a byte limit. The declared Content-Length is checked first; a chunked or
 * lying server is caught while streaming, and the connection is cancelled at that point.
 * The timeout signal on the request also covers this read.
 */
export async function readTextCapped(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Feed too large: ${declared} bytes (limit ${maxBytes})`);
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error(`Feed too large: over ${maxBytes} bytes`);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
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
      // Feed content is untrusted: only absolute http(s) links are stored (the cards also
      // run safeHref, this keeps javascript:/data: links out of the database altogether).
      const link = typeof item.link === "string" ? item.link.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim().slice(0, MAX_TITLE_CHARS) : "";
      if (!link || !title || !isHttpUrl(link)) continue;
      // An unparseable date is stored as null instead of throwing in toISOString(), which
      // used to drop the whole feed for one malformed pubDate.
      const publishedAt = parseDate(item.isoDate ?? item.pubDate);
      if (publishedAt && publishedAt.getTime() < cutoff) continue;
      const content =
        (item.contentSnippet || item.content || item.summary || "").toString().slice(0, 4000) || null;
      articles.push({
        source_id: source.id,
        url: link,
        title,
        raw_content: content,
        published_at: publishedAt ? publishedAt.toISOString() : null,
      });
    }
    return { source, articles };
  });

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || raw === "") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
