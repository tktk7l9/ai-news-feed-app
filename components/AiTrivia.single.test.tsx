import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// A single-entry pool would spin forever looking for a different entry; the button must be a no-op.
vi.mock("@/lib/trivia", () => ({
  AI_TRIVIA: ["唯一の雑学"],
  pickRandomTrivia: () => "唯一の雑学",
}));

import { AiTrivia } from "./AiTrivia";

describe("AiTrivia with a single trivia", () => {
  it("keeps showing the only entry instead of hanging", async () => {
    render(<AiTrivia initial="唯一の雑学" />);
    await userEvent.click(screen.getByRole("button", { name: "別の雑学を見る" }));
    expect(screen.getByRole("region", { name: "AI雑学" })).toHaveTextContent("唯一の雑学");
  });
});
