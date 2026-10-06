import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { article, digest } from "@/test/fixtures";

const queries = vi.hoisted(() => ({
  getLatestDigest: vi.fn(),
  getWeeklyCategoryStats: vi.fn(),
  getWeeklyTopArticles: vi.fn(),
}));
vi.mock("@/lib/queries", () => queries);

import HomePage from "./page";

const ERR = "ニュースを読み込めませんでした。時間をおいて再読み込みしてください。";

describe("HomePage", () => {
  beforeEach(() => {
    queries.getLatestDigest.mockReset();
    queries.getWeeklyCategoryStats.mockResolvedValue({ stats: [{ category: "llm", count: 3 }], error: null });
    queries.getWeeklyTopArticles.mockResolvedValue({ articles: [article({ id: "top", title_ja: "注目記事" })], error: null });
  });

  it("shows the waiting state with trivia when no digest exists yet", async () => {
    queries.getLatestDigest.mockResolvedValue({ digest: null, articles: [], error: null });
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("本日のニュースはまだありません");
    expect(screen.getByRole("region", { name: "AI雑学" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the digest, pins model releases above the rest and links to the archive", async () => {
    queries.getLatestDigest.mockResolvedValue({
      digest: digest({ overview_ja: "本日の概況" }),
      articles: [
        article({ id: "r1", title_ja: "通常の記事" }),
        article({ id: "m1", title_ja: "新モデル登場", is_model_release: true }),
      ],
      error: null,
    });
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2026年9月30日のダイジェスト");
    expect(screen.getByText("本日の概況")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "新モデルリリース" })).toBeInTheDocument();
    // The release card sits under the h2 as an h3; the regular card is its own h2.
    expect(screen.getByRole("heading", { level: 3, name: /新モデル登場/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /通常の記事/ })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading").map((h) => h.textContent ?? "");
    expect(headings.findIndex((t) => t.includes("新モデル登場"))).toBeLessThan(
      headings.findIndex((t) => t.includes("通常の記事")),
    );
    expect(screen.getByRole("link", { name: "過去のアーカイブを見る →" })).toHaveAttribute("href", "/archive");
    const aside = screen.getByRole("complementary", { name: "今週のまとめ" });
    expect(within(aside).getByRole("link", { name: /注目記事/ })).toBeInTheDocument();
    expect(within(aside).getByRole("link", { name: /LLM・基盤モデル/ })).toBeInTheDocument();
    expect(within(aside).getByRole("heading", { name: "主要モデル（2026年10月6日時点）" })).toBeInTheDocument();
  });

  it("omits the release section when nothing was released", async () => {
    queries.getLatestDigest.mockResolvedValue({ digest: digest(), articles: [article()], error: null });
    render(await HomePage());
    expect(screen.queryByRole("heading", { name: "新モデルリリース" })).toBeNull();
    expect(screen.queryByText("NEW MODEL")).toBeNull();
  });

  it("shows one constructive alert when the digest fails, and keeps the archive link", async () => {
    queries.getLatestDigest.mockResolvedValue({ digest: null, articles: [], error: ERR });
    queries.getWeeklyCategoryStats.mockResolvedValue({ stats: [], error: ERR });
    queries.getWeeklyTopArticles.mockResolvedValue({ articles: [], error: ERR });
    render(await HomePage());
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(ERR);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("今日のAIニュース");
    expect(screen.getByRole("link", { name: "過去のアーカイブを見る →" })).toBeInTheDocument();
    // Failed side panels are hidden rather than shown as empty.
    expect(screen.queryByText("まだ高重要度の記事がありません")).toBeNull();
    expect(screen.queryByText("まだ記事がありません")).toBeNull();
    expect(screen.getByRole("heading", { name: "主要モデル（2026年10月6日時点）" })).toBeInTheDocument();
  });

  it("keeps the digest and hides only the failed side panel", async () => {
    queries.getLatestDigest.mockResolvedValue({ digest: digest(), articles: [article()], error: null });
    queries.getWeeklyTopArticles.mockResolvedValue({ articles: [], error: ERR });
    render(await HomePage());
    expect(screen.getByRole("alert")).toHaveTextContent(ERR);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("のダイジェスト");
    expect(screen.queryByRole("heading", { name: "今週の注目" })).toBeNull();
    expect(screen.getByRole("heading", { name: "今週のカテゴリ" })).toBeInTheDocument();
  });
});
