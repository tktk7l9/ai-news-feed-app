import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ArticleCard } from "./ArticleCard";
import { article } from "@/test/fixtures";

describe("ArticleCard", () => {
  it("links the title to the article in a new tab and announces the external hop", () => {
    render(<ArticleCard article={article()} />);
    const link = screen.getByRole("link", { name: /新しいモデルが公開された/ });
    expect(link).toHaveAttribute("href", "https://example.com/post");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(link).getByText("（外部サイト・新しいタブで開きます）")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("新しいモデルが公開された");
    expect(screen.getByText("要約テキスト")).toBeInTheDocument();
  });

  it("uses a heading level 3 when nested under a section heading", () => {
    render(<ArticleCard article={article()} headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("falls back to the source name when the title is blank", () => {
    render(<ArticleCard article={article({ title_ja: "   " })} />);
    expect(screen.getByRole("link", { name: /Example Blog の記事/ })).toBeInTheDocument();
  });

  it("shows the NEW MODEL badge only for model releases", () => {
    const { rerender } = render(<ArticleCard article={article({ is_model_release: true })} />);
    expect(screen.getByText("NEW MODEL")).toBeInTheDocument();
    rerender(<ArticleCard article={article({ is_model_release: false })} />);
    expect(screen.queryByText("NEW MODEL")).toBeNull();
  });

  it("shows the category badge, the source and the importance as text", () => {
    render(<ArticleCard article={article({ category: "research", importance: 4 })} />);
    expect(screen.getByRole("link", { name: "研究・論文" })).toHaveAttribute("href", "/category/research");
    expect(screen.getByText("Example Blog")).toBeInTheDocument();
    expect(screen.getByText("重要度 4（5段階）")).toBeInTheDocument();
    expect(screen.getByText("★★★★☆")).toBeInTheDocument();
  });

  it("neutralises non-http URLs instead of rendering a javascript: link", () => {
    render(<ArticleCard article={article({ url: "javascript:alert(1)" })} />);
    const link = screen.getByRole("link", { name: /新しいモデルが公開された/ });
    expect(link).toHaveAttribute("href", "#");
  });
});
