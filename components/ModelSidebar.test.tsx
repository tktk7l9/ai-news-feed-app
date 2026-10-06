import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MODELS } from "@/lib/models";
import { ModelSidebar } from "./ModelSidebar";

describe("ModelSidebar", () => {
  it("titles the list with the verification date", () => {
    render(<ModelSidebar />);
    expect(screen.getByRole("heading", { level: 2, name: "主要モデル（2026年10月6日時点）" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "主要モデル（2026年10月6日時点）" })).toBeInTheDocument();
  });

  it("lists every model with vendor, release date, note and a vendor link that opens safely", () => {
    render(<ModelSidebar />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(MODELS.length);
    for (const m of MODELS) {
      const link = screen.getByRole("link", { name: new RegExp(`^${m.name.replace(/[.()]/g, "\\$&")}`) });
      expect(link).toHaveAttribute("href", m.sourceUrl);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const item = link.closest("li")!;
      expect(item).toHaveTextContent(m.vendor);
      expect(item).toHaveTextContent(m.note);
      expect(within(item).getByText((_, el) => el?.getAttribute("datetime") === m.releasedAt)).toBeInTheDocument();
    }
  });

  it("splits closed and open-weight models under text headings, not by colour", () => {
    render(<ModelSidebar />);
    const [closed, open] = screen.getAllByRole("heading", { level: 3 });
    expect(closed).toHaveTextContent("各社の主力モデル");
    expect(open).toHaveTextContent("オープンウェイト（重みを公開）");
    const openList = open.nextElementSibling as HTMLElement;
    expect(within(openList).getAllByRole("listitem")).toHaveLength(MODELS.filter((m) => m.openWeights).length);
  });

  it("shows no scores or score bars", () => {
    const { container } = render(<ModelSidebar />);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
    expect(container).not.toHaveTextContent(/スコア|ベンチマーク/);
  });
});
