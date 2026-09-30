import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyStats } from "./WeeklyStats";

describe("WeeklyStats", () => {
  it("shows the empty state with a zero total", () => {
    render(<WeeklyStats stats={[]} />);
    expect(screen.getByText("0件")).toBeInTheDocument();
    expect(screen.getByText("まだ記事がありません")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("lists each category as a link with its count, scaled against the largest", () => {
    render(
      <WeeklyStats
        stats={[
          { category: "llm", count: 8 },
          { category: "tool", count: 2 },
        ]}
      />,
    );
    expect(screen.getByText("10件")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const llm = screen.getByRole("link", { name: /LLM・基盤モデル/ });
    expect(llm).toHaveAttribute("href", "/category/llm");
    expect(llm).toHaveTextContent("8件");
    const tool = screen.getByRole("link", { name: /ツール・開発/ });
    expect(tool).toHaveAttribute("href", "/category/tool");
    const bars = items.map((li) => li.querySelector("span[aria-hidden] > span") as HTMLElement);
    expect(bars[0].style.width).toBe("100%");
    expect(bars[1].style.width).toBe("25%");
  });
});
