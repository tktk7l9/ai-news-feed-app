import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { article, digest } from "@/test/fixtures";

// News titles, summaries, source names and the daily overview come from external RSS feeds and
// Gemini. The Worker stamps the CSP nonce on every inline <script> in the HTML (lib/csp-nonce.ts),
// so markup smuggled in through that text must come out escaped, never as elements. This renders
// every page that shows news with hostile text in each field and checks the server HTML.

const SCRIPT = "</script><script>alert(1)</script>";
const IMG = "<img src=x onerror=alert(1)>";
const HOSTILE = `${SCRIPT}${IMG}`;
const SCRIPT_ESCAPED = "&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;";
const IMG_ESCAPED = "&lt;img src=x onerror=alert(1)&gt;";

const hostileArticle = (id: string, extra: Parameters<typeof article>[0] = {}) =>
  article({
    id,
    title_ja: `タイトル${HOSTILE}`,
    summary_ja: `要約${HOSTILE}`,
    source_name: `配信元${HOSTILE}`,
    url: "javascript:alert(1)",
    ...extra,
  });
const hostileDigest = digest({ overview_ja: `総括${HOSTILE}` });

const queries = vi.hoisted(() => ({
  getLatestDigest: vi.fn(),
  getWeeklyCategoryStats: vi.fn(),
  getWeeklyTopArticles: vi.fn(),
  getArticlesByCategory: vi.fn(),
  getArchiveDates: vi.fn(),
  getDigest: vi.fn(),
  getAdjacentDigestDates: vi.fn(),
}));
vi.mock("@/lib/queries", () => queries);

import HomePage from "./page";
import CategoryPage from "./category/[slug]/page";
import ArchiveIndex from "./archive/page";
import ArchiveDay from "./archive/[date]/page";

beforeEach(() => {
  const articles = [hostileArticle("m1", { is_model_release: true }), hostileArticle("r1")];
  queries.getLatestDigest.mockResolvedValue({ digest: hostileDigest, articles, error: null });
  queries.getWeeklyCategoryStats.mockResolvedValue({ stats: [{ category: "llm", count: 2 }], error: null });
  queries.getWeeklyTopArticles.mockResolvedValue({ articles: [hostileArticle("t1")], error: null });
  queries.getArticlesByCategory.mockResolvedValue({ articles, error: null });
  queries.getArchiveDates.mockResolvedValue({
    dates: [{ date: hostileDigest.date, article_count: 2, overview_ja: hostileDigest.overview_ja }],
    error: null,
  });
  queries.getDigest.mockResolvedValue({ digest: hostileDigest, articles, error: null });
  queries.getAdjacentDigestDates.mockResolvedValue({ prev: null, next: null });
});

const pages: [string, () => Promise<ReactElement>, number][] = [
  // [page, render, minimum number of hostile fields shown]
  ["home", () => HomePage(), 9],
  ["category", () => CategoryPage({ params: Promise.resolve({ slug: "llm" }) }), 6],
  ["archive index", () => ArchiveIndex(), 1],
  ["archive day", () => ArchiveDay({ params: Promise.resolve({ date: hostileDigest.date }) }), 7],
];

describe("hostile feed text", () => {
  for (const [name, renderPage, fields] of pages) {
    it(`renders escaped on the ${name} page`, async () => {
      const html = renderToStaticMarkup(await renderPage());
      // No element came out of the text: the pages themselves render no script or img.
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/<img/i);
      // No event-handler attribute inside any tag (the escaped text itself reads "onerror=").
      expect(html).not.toMatch(/<[^>]*\son\w+=/i);
      expect(html).not.toContain('href="javascript:');
      // The text is still shown, escaped, in every field that carries it.
      expect(html.split(SCRIPT_ESCAPED).length - 1).toBeGreaterThanOrEqual(fields);
      expect(html.split(IMG_ESCAPED).length - 1).toBeGreaterThanOrEqual(fields);
    });
  }
});
