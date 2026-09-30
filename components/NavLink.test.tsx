import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavLink } from "./NavLink";

const usePathname = vi.fn<() => string | null>();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

describe("NavLink", () => {
  beforeEach(() => usePathname.mockReset());

  it("marks the link as the current page on its own path and below", () => {
    usePathname.mockReturnValue("/archive/2026-09-30");
    render(<NavLink href="/archive">アーカイブ</NavLink>);
    const link = screen.getByRole("link", { name: "アーカイブ" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("href", "/archive");
  });

  it("is a plain link elsewhere, including a path that merely shares a prefix", () => {
    usePathname.mockReturnValue("/archives-old");
    render(<NavLink href="/archive">アーカイブ</NavLink>);
    expect(screen.getByRole("link", { name: "アーカイブ" })).not.toHaveAttribute("aria-current");
  });

  it("survives a null pathname before hydration", () => {
    usePathname.mockReturnValue(null);
    render(<NavLink href="/archive">アーカイブ</NavLink>);
    expect(screen.getByRole("link", { name: "アーカイブ" })).not.toHaveAttribute("aria-current");
  });
});
