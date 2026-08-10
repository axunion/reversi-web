import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import boardStyles from "../../components/Board/Board.module.css";
import turnIndicatorStyles from "../../components/TurnIndicator/TurnIndicator.module.css";
import GameScreen from "./GameScreen";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.doUnmock("../../logic/rules");
  vi.resetModules();
});

describe("GameScreen", () => {
  it("plays a move through the real DOM: board updates immediately, input locks during the flip animation, and the turn indicator hands over once it settles", () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />
    ));

    const sides = () =>
      container.querySelectorAll(`.${turnIndicatorStyles.side}`);
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

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

  it("opens InGameMenu from the menu button, and Resume closes it again", () => {
    render(() => <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />);

    expect(screen.queryByText("Menu")).toBeNull();

    fireEvent.click(screen.getByLabelText("Menu"));
    const dialog = screen.getByRole("dialog");
    expect(screen.getByText("Menu")).not.toBeNull();
    expect(dialog.hasAttribute("data-closed")).toBe(false);

    fireEvent.click(screen.getByText("Resume"));
    // Kobalte keeps the dialog mounted through its exit animation, which
    // never fires an animationend event in this test environment, so it
    // can't be observed leaving the DOM here (InGameMenu.test.tsx doesn't
    // either). data-closed flips synchronously with the open state though.
    expect(dialog.hasAttribute("data-closed")).toBe(true);
  });

  it("Restart puts the board back to the opening position and closes the menu", () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);
    const sides = () =>
      container.querySelectorAll(`.${turnIndicatorStyles.side}`);

    fireEvent.click(buttons()[19]); // d3
    vi.runAllTimers();
    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
    expect(sides()[1].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    ); // white's turn now

    fireEvent.click(screen.getByLabelText("Menu"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByText("Restart"));

    expect(dialog.hasAttribute("data-closed")).toBe(true);
    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();
    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    ); // back to black's turn
  });

  it("calls onQuit when Quit to Title is clicked in the menu", () => {
    const onQuit = vi.fn();
    render(() => <GameScreen config={{ mode: "pvp" }} onQuit={onQuit} />);

    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Quit to Title"));

    expect(onQuit).toHaveBeenCalledOnce();
  });

  it("shows ResultOverlay with the real score once the store reaches status 'ended', and Rematch resets the game", async () => {
    vi.resetModules();
    vi.doMock("../../logic/rules", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../logic/rules")>();
      return {
        ...actual,
        progressAfter: () => ({
          kind: "gameOver" as const,
          winner: 1 as const,
        }),
      };
    });

    const { default: GameScreenWithGameOver } = await import("./GameScreen");

    vi.useFakeTimers();
    const { container } = render(() => (
      <GameScreenWithGameOver config={{ mode: "pvp" }} onQuit={() => {}} />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    fireEvent.click(buttons()[19]); // d3, flips one white disc to black
    vi.runAllTimers();

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Black wins")).not.toBeNull();
    expect(dialog.getByText("4")).not.toBeNull(); // black: 2 initial + 1 placed + 1 flipped
    expect(dialog.getByText("1")).not.toBeNull(); // white: 2 initial - 1 flipped

    fireEvent.click(screen.getByText("Rematch"));

    expect(screen.queryByText("Black wins")).toBeNull();
    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();
  });

  it("calls onQuit when Back to Title is clicked on the result overlay", async () => {
    vi.resetModules();
    vi.doMock("../../logic/rules", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../logic/rules")>();
      return {
        ...actual,
        progressAfter: () => ({
          kind: "gameOver" as const,
          winner: 1 as const,
        }),
      };
    });

    const { default: GameScreenWithGameOver } = await import("./GameScreen");

    vi.useFakeTimers();
    const onQuit = vi.fn();
    const { container } = render(() => (
      <GameScreenWithGameOver config={{ mode: "pvp" }} onQuit={onQuit} />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    fireEvent.click(buttons()[19]);
    vi.runAllTimers();

    fireEvent.click(screen.getByText("Back to Title"));

    expect(onQuit).toHaveBeenCalledOnce();
  });
});
