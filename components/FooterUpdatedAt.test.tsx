import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const tryGetServiceClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ tryGetServiceClient: () => tryGetServiceClient() }));

import { FooterUpdatedAt } from "./FooterUpdatedAt";

function clientReturning(result: { data: { date: string } | null }) {
  const chain = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

describe("FooterUpdatedAt", () => {
  beforeEach(() => tryGetServiceClient.mockReset());

  it("shows the schedule when Supabase is not configured", async () => {
    tryGetServiceClient.mockReturnValue(null);
    render(await FooterUpdatedAt());
    expect(screen.getByText("毎朝 JST 06:00 更新")).toBeInTheDocument();
  });

  it("shows the schedule when there is no digest yet", async () => {
    tryGetServiceClient.mockReturnValue(clientReturning({ data: null }));
    render(await FooterUpdatedAt());
    expect(screen.getByText("毎朝 JST 06:00 更新")).toBeInTheDocument();
  });

  it("shows the latest digest date in Japanese", async () => {
    const client = clientReturning({ data: { date: "2026-09-30" } });
    tryGetServiceClient.mockReturnValue(client);
    render(await FooterUpdatedAt());
    expect(screen.getByText("最終更新: 2026年9月30日")).toBeInTheDocument();
    expect(client.from).toHaveBeenCalledWith("daily_digests");
    expect(client.order).toHaveBeenCalledWith("date", { ascending: false });
  });
});
