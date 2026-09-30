import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("is an alert with a default title, the message, a reload button and the archive as the way out", () => {
    render(<ErrorBanner message="ニュースを読み込めませんでした。" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("読み込みに失敗しました");
    expect(alert).toHaveTextContent("ニュースを読み込めませんでした。");
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "過去のアーカイブを見る" })).toHaveAttribute("href", "/archive");
  });

  it("accepts a custom title and alternative link", () => {
    render(<ErrorBanner title="取得に失敗" message="m" alternative={{ href: "/", label: "トップに戻る" }} />);
    expect(screen.getByText("取得に失敗")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップに戻る" })).toHaveAttribute("href", "/");
  });

  it("omits the alternative link when set to null", () => {
    render(<ErrorBanner message="m" alternative={null} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });
});
