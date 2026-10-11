import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { BEACON_SRC, BEACON_TOKEN } from "@/lib/analytics";
import { Analytics } from "./Analytics";

const beacons = () => document.querySelectorAll(`script[src="${BEACON_SRC}"]`);

describe("Analytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    for (const script of beacons()) script.remove();
  });

  it("renders nothing on the server, so the HTML carries no external script", () => {
    expect(renderToStaticMarkup(<Analytics />)).toBe("");
  });

  it("appends the beacon as a module script with the site token after hydration in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<Analytics />);
    expect(container.innerHTML).toBe("");
    const [beacon] = beacons();
    expect(beacons()).toHaveLength(1);
    expect(beacon.parentElement).toBe(document.body);
    expect(beacon).toHaveAttribute("type", "module");
    // No SRI: Cloudflare updates beacon.min.js in place.
    expect(beacon).not.toHaveAttribute("integrity");
    expect(JSON.parse(beacon.getAttribute("data-cf-beacon") ?? "")).toEqual({ token: BEACON_TOKEN });
  });

  it("adds the beacon only once across remounts", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<Analytics />).unmount();
    render(<Analytics />);
    expect(beacons()).toHaveLength(1);
  });

  it("does nothing outside production (dev and tests send no analytics)", () => {
    render(<Analytics />);
    expect(beacons()).toHaveLength(0);
  });
});
