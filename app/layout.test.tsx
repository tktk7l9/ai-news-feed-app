import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/archive" }));
// Async server component: the footer's own tests cover it.
vi.mock("@/components/FooterUpdatedAt", () => ({ FooterUpdatedAt: () => <span>最終更新: テスト</span> }));

import RootLayout, { metadata, viewport } from "./layout";

describe("RootLayout", () => {
  it("wraps the page with a skip link, header navigation, main landmark and footer", () => {
    render(
      <RootLayout>
        <p>ページ本文</p>
      </RootLayout>,
    );
    expect(document.documentElement).toHaveAttribute("lang", "ja");
    expect(screen.getByRole("link", { name: "本文へスキップ" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("link", { name: /AI News/ })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "メイン" });
    expect(nav).toContainElement(screen.getByRole("link", { name: "アーカイブ" }));
    expect(screen.getByRole("link", { name: "アーカイブ" })).toHaveAttribute("aria-current", "page");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveTextContent("ページ本文");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("最終更新: テスト");
  });

  it("declares the site metadata and theme colours", () => {
    expect(String(metadata.metadataBase)).toMatch(/^https:\/\//);
    expect(metadata.title).toEqual({ default: "AIニュース・ダイジェスト", template: "%s | AIニュース・ダイジェスト" });
    expect(viewport.themeColor).toHaveLength(2);
  });
});
