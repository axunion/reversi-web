import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import boardStyles from "../../components/Board/Board.module.css";
import turnIndicatorStyles from "../../components/TurnIndicator/TurnIndicator.module.css";
import GameScreen from "./GameScreen";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GameScreen", () => {
  it("plays a move through the real DOM: board updates immediately, input locks during the flip animation, and the turn indicator hands over once it settles", () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />
    ));

    const sides = () =>
      container.querySelectorAll(`.${turnIndicatorStyles.side}`);
    const buttons = () => container.querySelectorAll("button");

    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    );

    fireEvent.click(buttons()[19]); // d3, a legal opening move

    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
    expect(buttons()[27].querySelector('[class*="disc"]')).not.toBeNull(); // d4, flipped
    expect(buttons()[19].classList.contains(boardStyles.lastMove)).toBe(true);
    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(true); // locked mid-animation
    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    ); // not handed over yet

    vi.runAllTimers();

    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(false);
    expect(sides()[1].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    );
    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      false,
    );
  });
});
