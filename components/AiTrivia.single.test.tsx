import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// A single-entry pool would spin forever looking for a different entry; the button must be a no-op.
// The mock throws after a few draws so that a broken guard fails the test instead of hanging the
// worker (a synchronous infinite loop cannot be interrupted by the test timeout).
const pickRandomTrivia = vi.hoisted(() => {
  let calls = 0;
  return vi.fn(() => {
    if (++calls > 5) throw new Error("AiTrivia kept redrawing from a single-entry pool");
    return "唯一の雑学";
  });
});
vi.mock("@/lib/trivia", () => ({ AI_TRIVIA: ["唯一の雑学"], pickRandomTrivia }));

import { AiTrivia } from "./AiTrivia";

describe("AiTrivia with a single trivia", () => {
  it("keeps showing the only entry instead of hanging", async () => {
    render(<AiTrivia initial="唯一の雑学" />);
    await userEvent.click(screen.getByRole("button", { name: "別の雑学を見る" }));
    expect(screen.getByRole("region", { name: "AI雑学" })).toHaveTextContent("唯一の雑学");
    expect(pickRandomTrivia).not.toHaveBeenCalled();
  });
});
