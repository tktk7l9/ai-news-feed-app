import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReloadButton } from "./ReloadButton";

const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, "location", { value: originalLocation, configurable: true, writable: true });
});

describe("ReloadButton", () => {
  it("calls onRetry when one is given", async () => {
    const onRetry = vi.fn();
    render(<ReloadButton onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reloads the page when no handler is given", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", { value: { reload }, configurable: true, writable: true });
    render(<ReloadButton />);
    await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
