import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryBadge } from "./CategoryBadge";
import type { Category } from "@/lib/types";

describe("CategoryBadge", () => {
  it("links to the category page with the Japanese label", () => {
    render(<CategoryBadge category="tool" />);
    const link = screen.getByRole("link", { name: "ツール・開発" });
    expect(link).toHaveAttribute("href", "/category/tool");
  });

  it("renders plain text when link is false", () => {
    render(<CategoryBadge category="image" link={false} />);
    expect(screen.getByText("画像・動画生成")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("falls back to the raw slug and neutral style for an unknown category from the DB", () => {
    render(<CategoryBadge category={"robotics" as Category} link={false} />);
    expect(screen.getByText("robotics")).toHaveClass("bg-neutral-100");
  });
});
