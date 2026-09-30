import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { article, digest } from "@/test/fixtures";

const queries = vi.hoisted(() => ({ getDigest: vi.fn(), getAdjacentDigestDates: vi.fn() }));
vi.mock("@/lib/queries", () => queries);
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import ArchiveDay, { generateMetadata } from "./page";

const params = (date: string) => ({ params: Promise.resolve({ date }) });

describe("ArchiveDay", () => {
  beforeEach(() => {
    queries.getDigest.mockReset();
    queries.getAdjacentDigestDates.mockReset();
    queries.getAdjacentDigestDates.mockResolvedValue({ prev: "2026-09-29", next: "2026-10-01" });
  });

  it("returns 404 for a malformed date without touching the database", async () => {
    await expect(ArchiveDay(params("2026-9-3"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(queries.getDigest).not.toHaveBeenCalled();
    expect(await generateMetadata(params("2026-9-3"))).toEqual({});
  });

  it("returns 404 when the day has no digest", async () => {
    queries.getDigest.mockResolvedValue({ digest: null, articles: [], error: null });
    await expect(ArchiveDay(params("2026-09-30"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await generateMetadata(params("2026-09-30"))).toEqual({ title: "ページが見つかりません" });
  });

  it("renders the digest with a day pager at the top and bottom", async () => {
    queries.getDigest.mockResolvedValue({
      digest: digest({ date: "2026-09-30", overview_ja: "その日の概況", article_count: 2 }),
      articles: [article({ id: "1", title_ja: "記事A" }), article({ id: "2", title_ja: "記事B" })],
      error: null,
    });
    render(await ArchiveDay(params("2026-09-30")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2026年9月30日のダイジェスト");
    expect(screen.getByText("その日の概況")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "アーカイブに戻る" })).toHaveAttribute("href", "/archive");
    expect(screen.getByRole("link", { name: /記事A/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /記事B/ })).toBeInTheDocument();

    const pagers = screen.getAllByRole("navigation", { name: "前後の日" });
    expect(pagers).toHaveLength(2);
    for (const nav of pagers) {
      const prev = within(nav).getByRole("link", { name: /前の日（2026年9月29日）/ });
      const next = within(nav).getByRole("link", { name: /次の日（2026年10月1日）/ });
      expect(prev).toHaveAttribute("href", "/archive/2026-09-29");
      expect(next).toHaveAttribute("href", "/archive/2026-10-01");
      // rel tells browsers and crawlers which way each link goes.
      expect(prev).toHaveAttribute("rel", "prev");
      expect(next).toHaveAttribute("rel", "next");
    }
    expect(await generateMetadata(params("2026-09-30"))).toEqual({ title: "2026年9月30日のダイジェスト" });
  });

  it("drops a pager link when there is no neighbouring day", async () => {
    queries.getDigest.mockResolvedValue({ digest: digest(), articles: [], error: null });
    queries.getAdjacentDigestDates.mockResolvedValue({ prev: null, next: "2026-10-01" });
    render(await ArchiveDay(params("2026-09-30")));
    expect(screen.queryByRole("link", { name: /前の日/ })).toBeNull();
    expect(screen.getAllByRole("link", { name: /次の日/ })).toHaveLength(2);
  });

  it("shows the alert with the day title when loading fails", async () => {
    queries.getDigest.mockResolvedValue({ digest: null, articles: [], error: "読み込めませんでした" });
    render(await ArchiveDay(params("2026-09-30")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2026年9月30日のダイジェスト");
    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
    // The back link is the only way to the archive; the banner does not repeat it.
    expect(screen.getAllByRole("link", { name: /アーカイブ/ })).toHaveLength(1);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(await generateMetadata(params("2026-09-30"))).toEqual({ title: "2026年9月30日のダイジェスト" });
  });
});
