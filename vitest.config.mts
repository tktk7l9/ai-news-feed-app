import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // UI tests are .tsx; the lib tests under lib/*.test.ts run on node:test (npm run test:lib).
    include: ["**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", ".open-next/**", ".wrangler/**"],
    // Production runs on Cloudflare Workers (UTC). Pin the test clock to the same
    // zone so date-rendering tests fail the way production would, not the way a
    // JST laptop would.
    env: { TZ: "UTC" },
    coverage: {
      provider: "v8",
      include: ["components/**/*.tsx", "app/**/*.tsx"],
      exclude: [
        "**/*.test.*",
        // Image generation (ImageResponse) runs only in Next's edge/OG pipeline.
        "app/apple-icon.tsx",
        "app/opengraph-image.tsx",
      ],
      reporter: ["text", "json-summary"],
      // Measured 100 / 98.95 / 100 / 100 over three runs; gate two points below so a
      // regression fails CI while unrelated refactors do not (same practice as the sibling repos).
      thresholds: { statements: 98, branches: 96, functions: 98, lines: 98 },
    },
  },
});
