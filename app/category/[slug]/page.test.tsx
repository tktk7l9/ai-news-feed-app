import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { article } from "@/test/fixtures";
import { CATEGORIES } from "@/lib/types";

const queries = vi.hoisted(() => ({ getArticlesByCategory: vi.fn() }));
vi.mock("@/lib/queries", () => queries);
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import CategoryPage, { generateMetadata, generateStaticParams } from "./page";

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("CategoryPage", () => {
  beforeEach(() => queries.getArticlesByCategory.mockReset());

  it("prebuilds every category and titles the tab with its label", async () => {
    expect(generateStaticParams()).toEqual(CATEGORIES.map((slug) => ({ slug })));
    expect(await generateMetadata(params("research"))).toEqual({ title: "研究・論文" });
    expect(await generateMetadata(params("nope"))).toEqual({});
  });

  it("returns 404 for an unknown slug", async () => {
    await expect(CategoryPage(params("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(queries.getArticlesByCategory).not.toHaveBeenCalled();
  });

  it("groups articles by digest day, newest first as returned", async () => {
    queries.getArticlesByCategory.mockResolvedValue({
      articles: [
        article({ id: "1", digest_date: "2026-09-30", title_ja: "今日の記事" }),
        article({ id: "2", digest_date: "2026-09-30", title_ja: "今日のもう一件" }),
        article({ id: "3", digest_date: "2026-09-28", title_ja: "一昨日の記事" }),
      ],
      error: null,
    });
    render(await CategoryPage(params("llm")));
    expect(queries.getArticlesByCategory).toHaveBeenCalledWith("llm", 50);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("カテゴリ: LLM・基盤モデル");
    expect(screen.getByRole("link", { name: "トップに戻る" })).toHaveAttribute("href", "/");
    const days = screen.getAllByRole("region");
    expect(days.map((s) => s.getAttribute("aria-labelledby"))).toEqual(["day-2026-09-30", "day-2026-09-28"]);
    expect(within(days[0]).getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(within(days[1]).getByRole("heading", { level: 3 })).toHaveTextContent("一昨日の記事");
    expect(screen.getByRole("heading", { level: 2, name: "2026年9月30日" })).toBeInTheDocument();
  });

  it("shows trivia instead of an empty list", async () => {
    queries.getArticlesByCategory.mockResolvedValue({ articles: [], error: null });
    render(await CategoryPage(params("tool")));
    expect(screen.getByText(/このカテゴリにはまだ記事がありません/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AI雑学" })).toBeInTheDocument();
  });

  it("shows an alert on failure", async () => {
    queries.getArticlesByCategory.mockResolvedValue({ articles: [], error: "読み込めませんでした" });
    render(await CategoryPage(params("tool")));
    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.queryByRole("region", { name: "AI雑学" })).toBeNull();
  });
});
