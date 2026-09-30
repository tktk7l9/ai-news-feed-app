import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiTrivia } from "./AiTrivia";
import { AI_TRIVIA } from "@/lib/trivia";

afterEach(() => vi.restoreAllMocks());

// Math.random in [0,1) maps to index floor(r * length); pick r so the index is exact.
const indexAsRandom = (i: number) => (i + 0.5) / AI_TRIVIA.length;

describe("AiTrivia", () => {
  it("shows the initial trivia inside a labelled section", () => {
    render(<AiTrivia initial={AI_TRIVIA[0]} />);
    expect(screen.getByRole("region", { name: "AI雑学" })).toHaveTextContent(AI_TRIVIA[0]);
  });

  it("never repeats the trivia that is already on screen", async () => {
    // First draw collides with the current trivia and must be redrawn.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(indexAsRandom(0))
      .mockReturnValueOnce(indexAsRandom(3))
      .mockReturnValueOnce(indexAsRandom(7));
    const user = userEvent.setup();
    render(<AiTrivia initial={AI_TRIVIA[0]} />);
    const button = screen.getByRole("button", { name: "別の雑学を見る" });
    const region = screen.getByRole("region", { name: "AI雑学" });
    await user.click(button);
    expect(region).toHaveTextContent(AI_TRIVIA[3]);
    expect(region).not.toHaveTextContent(AI_TRIVIA[0]);
    await user.click(button);
    expect(region).toHaveTextContent(AI_TRIVIA[7]);
  });
});
