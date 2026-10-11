"use client";

import { useEffect } from "react";
import { BEACON_SRC, BEACON_TOKEN } from "@/lib/analytics";

/**
 * Appends the Cloudflare Web Analytics beacon after hydration instead of a <script src> in the
 * HTML. Cloudflare swaps the content behind the unversioned beacon.min.js URL, so it cannot carry
 * Subresource Integrity (never add `integrity`: the next update would silently stop the beacon),
 * and an external script without it in the markup costs the Observatory SRI test. It also keeps
 * the beacon out of the first view's downloads. The CSP still allows its origin (next.config.ts).
 */
export function Analytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (document.querySelector(`script[src="${BEACON_SRC}"]`)) return;
    const beacon = document.createElement("script");
    beacon.type = "module";
    beacon.src = BEACON_SRC;
    beacon.dataset.cfBeacon = JSON.stringify({ token: BEACON_TOKEN });
    document.body.appendChild(beacon);
  }, []);
  return null;
}
