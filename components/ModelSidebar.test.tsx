import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelSidebar } from "./ModelSidebar";

describe("ModelSidebar", () => {
  it("groups models under the S / A / B tiers with their scores", () => {
    render(<ModelSidebar />);
    expect(screen.getByRole("heading", { name: "主要 AIモデル" })).toBeInTheDocument();
    expect(screen.getByText("S — フロンティア")).toBeInTheDocument();
    expect(screen.getByText("A — 高性能")).toBeInTheDocument();
    expect(screen.getByText("B — 軽量・OSS")).toBeInTheDocument();
    expect(screen.getByText("GPT-5.6 Sol")).toBeInTheDocument();
    expect(screen.getByText("Mistral Small 4")).toBeInTheDocument();
    expect(screen.getByText(/最終更新: 2026年7月時点/)).toBeInTheDocument();
  });

  it("scales the score bars between 60 and 100", () => {
    const { container } = render(<ModelSidebar />);
    const bars = [...container.querySelectorAll<HTMLElement>("div[style]")].map((b) => b.style.width);
    expect(bars.length).toBeGreaterThan(10);
    // 94 → 85%, 68 → 20%
    expect(bars).toContain("85%");
    expect(bars).toContain("20%");
    for (const w of bars) {
      const n = parseFloat(w);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(100);
    }
  });
});
