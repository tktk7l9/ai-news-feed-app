import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackLink } from "./BackLink";
import { DailyOverview } from "./DailyOverview";
import { ExternalMark } from "./ExternalMark";
import { ImportanceStars } from "./ImportanceStars";

describe("BackLink", () => {
  it("renders an accessible link to the given href", () => {
    render(<BackLink href="/archive">アーカイブに戻る</BackLink>);
    expect(screen.getByRole("link", { name: "アーカイブに戻る" })).toHaveAttribute("href", "/archive");
  });
});

describe("DailyOverview", () => {
  it("makes the day the page heading and shows the count and overview", () => {
    render(<DailyOverview date="2026-09-30" overview="今日の概況" articleCount={12} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("2026年9月30日のダイジェスト");
    expect(h1).toHaveTextContent("12件");
    expect(screen.getByText("今日の概況")).toBeInTheDocument();
  });
});

describe("ExternalMark", () => {
  it("hides the icon from screen readers and provides text instead", () => {
    const { container } = render(<ExternalMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("（外部サイト・新しいタブで開きます）")).toHaveClass("sr-only");
  });
});

describe("ImportanceStars", () => {
  it("shows filled and hollow stars with a spoken label", () => {
    render(<ImportanceStars value={2} />);
    expect(screen.getByText("★★☆☆☆")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("重要度 2（5段階）")).toHaveClass("sr-only");
    expect(screen.getByTitle("重要度 2（5段階）")).toBeInTheDocument();
  });
});
