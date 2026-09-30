import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound, { metadata } from "./not-found";

describe("app/not-found", () => {
  it("explains the likely cause and offers two ways forward", () => {
    render(<NotFound />);
    expect(metadata.title).toBe("ページが見つかりません");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ページが見つかりません");
    expect(screen.getByText(/90日を過ぎると自動で削除されます/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "今日のニュースを見る" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "アーカイブから探す" })).toHaveAttribute("href", "/archive");
  });
});
