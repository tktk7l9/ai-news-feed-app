import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "./error";

afterEach(() => vi.restoreAllMocks());

describe("app/error", () => {
  it("shows a constructive message, retries on demand and offers the top page", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error("boom"), { digest: "abc" });
    render(<ErrorPage error={error} retry={retry} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ページを表示できませんでした");
    expect(screen.getByRole("alert")).toHaveTextContent("一時的な問題の可能性があります");
    // Technical detail stays out of the page.
    expect(screen.queryByText(/boom|abc/)).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(error);
    await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "トップに戻る" })).toHaveAttribute("href", "/");
  });
});
