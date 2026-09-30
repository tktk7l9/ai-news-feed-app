import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const queries = vi.hoisted(() => ({ getArchiveDates: vi.fn() }));
vi.mock("@/lib/queries", () => queries);

import ArchiveIndex from "./page";

describe("ArchiveIndex", () => {
  beforeEach(() => queries.getArchiveDates.mockReset());

  it("groups days by month and shows the correct day number and weekday on a UTC server", async () => {
    queries.getArchiveDates.mockResolvedValue({
      dates: [
        { date: "2026-10-04", article_count: 7, overview_ja: "日曜のまとめ" },
        { date: "2026-10-03", article_count: 5, overview_ja: "" },
        { date: "2026-09-30", article_count: 12, overview_ja: "月末のまとめ" },
      ],
      error: null,
    });
    render(await ArchiveIndex());
    expect(process.env.TZ).toBe("UTC");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("アーカイブ");
    expect(screen.getByRole("link", { name: "トップに戻る" })).toHaveAttribute("href", "/");
    const months = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(months).toEqual(["2026年10月", "2026年9月"]);

    const sun = screen.getByRole("link", { name: /日曜のまとめ/ });
    expect(sun).toHaveAttribute("href", "/archive/2026-10-04");
    expect(within(sun).getByText("4")).toBeInTheDocument();
    expect(within(sun).getByText("日")).toBeInTheDocument();
    expect(within(sun).getByText("7件")).toBeInTheDocument();

    // Empty overview falls back to a dated title; 2026-10-03 is a Saturday.
    const sat = screen.getByRole("link", { name: /2026年10月3日のダイジェスト/ });
    expect(within(sat).getByText("土")).toBeInTheDocument();

    // 2026-09-30 is a Wednesday; the old +09:00 parsing showed 29 / 火 under UTC.
    const wed = screen.getByRole("link", { name: /月末のまとめ/ });
    expect(within(wed).getByText("30")).toBeInTheDocument();
    expect(within(wed).getByText("水")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    queries.getArchiveDates.mockResolvedValue({ dates: [], error: null });
    render(await ArchiveIndex());
    expect(screen.getByText("まだ過去のダイジェストがありません。")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an alert with a way back to the top on failure", async () => {
    queries.getArchiveDates.mockResolvedValue({ dates: [], error: "読み込めませんでした" });
    render(await ArchiveIndex());
    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(within(screen.getByRole("alert")).getByRole("link", { name: "トップに戻る" })).toHaveAttribute("href", "/");
  });
});
