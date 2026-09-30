import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

/**
 * jsdom has no `CSS` global. React 19.3's <ViewTransition> calls `CSS.escape()`
 * while committing to build a view-transition-name, so without this the render
 * throws ("Cannot read properties of undefined (reading 'escape')"). Real
 * browsers always ship CSS.escape; this only fills the test-environment gap.
 */
if (typeof (globalThis as { CSS?: unknown }).CSS === "undefined") {
  (globalThis as { CSS: { escape: (value: string) => string } }).CSS = {
    escape: (value: string) =>
      String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch.codePointAt(0)!.toString(16)} `),
  };
}
