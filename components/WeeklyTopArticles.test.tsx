import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyTopArticles } from "./WeeklyTopArticles";
import { article } from "@/test/fixtures";

describe("WeeklyTopArticles", () => {
  it("shows the empty state", () => {
    render(<WeeklyTopArticles articles={[]} />);
    expect(screen.getByRole("heading", { name: "今週の注目" })).toBeInTheDocument();
    expect(screen.getByText("まだ高重要度の記事がありません")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links each article externally with its short date, stars and source", () => {
    render(
      <WeeklyTopArticles
        articles={[
          article({ id: "1", digest_date: "2026-09-05", importance: 5 }),
          article({ id: "2", title_ja: "", source_name: "Lab", url: "ftp://x", digest_date: "2026-10-12" }),
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://example.com/post");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(links[0]).toHaveTextContent("9/5");
    expect(links[0]).toHaveTextContent("★★★★★");
    expect(links[0]).toHaveTextContent("Example Blog");
    expect(links[1]).toHaveTextContent("Lab の記事");
    expect(links[1]).toHaveTextContent("10/12");
    expect(links[1]).toHaveAttribute("href", "#");
  });
});
