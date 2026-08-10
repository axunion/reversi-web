import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialBoard } from "../../logic/rules";
import Board from "./Board";
import styles from "./Board.module.css";

afterEach(cleanup);

describe("Board", () => {
  it("renders 64 cell buttons", () => {
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[]}
        lastMove={null}
        flipDelays={{}}
        turn={1}
        disabled={false}
        onCellClick={() => {}}
      />
    ));

    expect(container.querySelectorAll("button").length).toBe(64);
  });

  it("calls onCellClick with the clicked cell's index", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[19]}
        lastMove={null}
        flipDelays={{}}
        turn={1}
        disabled={false}
        onCellClick={onCellClick}
      />
    ));

    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[19]);

    expect(onCellClick).toHaveBeenCalledExactlyOnceWith(19);
  });

  it("shows a black hint dot on legal moves when it is black's turn", () => {
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[19, 26]}
        lastMove={null}
        flipDelays={{}}
        turn={1}
        disabled={false}
        onCellClick={() => {}}
      />
    ));

    const buttons = container.querySelectorAll("button");
    expect(buttons[19].classList.contains(styles.hint)).toBe(true);
    expect(buttons[19].classList.contains(styles.hintWhite)).toBe(false);
    expect(buttons[26].classList.contains(styles.hint)).toBe(true);
    expect(buttons[0].classList.contains(styles.hint)).toBe(false);
  });

  it("shows a white hint dot on legal moves when it is white's turn", () => {
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[19]}
        lastMove={null}
        flipDelays={{}}
        turn={2}
        disabled={false}
        onCellClick={() => {}}
      />
    ));

    const buttons = container.querySelectorAll("button");
    expect(buttons[19].classList.contains(styles.hintWhite)).toBe(true);
    expect(buttons[19].classList.contains(styles.hint)).toBe(false);
  });

  it("hides hints and disables cells when disabled", () => {
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[19]}
        lastMove={null}
        flipDelays={{}}
        turn={1}
        disabled={true}
        onCellClick={() => {}}
      />
    ));

    const buttons = container.querySelectorAll("button");
    expect(buttons[19].classList.contains(styles.hint)).toBe(false);
    expect((buttons[19] as HTMLButtonElement).disabled).toBe(true);
  });

  it("marks the last-move cell", () => {
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[]}
        lastMove={27}
        flipDelays={{}}
        turn={1}
        disabled={false}
        onCellClick={() => {}}
      />
    ));

    const buttons = container.querySelectorAll("button");
    expect(buttons[27].classList.contains(styles.lastMove)).toBe(true);
    expect(buttons[28].classList.contains(styles.lastMove)).toBe(false);
  });

  it("renders a disc only in occupied cells", () => {
    const { container } = render(() => (
      <Board
        board={initialBoard()}
        legalMoves={[]}
        lastMove={null}
        flipDelays={{}}
        turn={1}
        disabled={false}
        onCellClick={() => {}}
      />
    ));

    const buttons = container.querySelectorAll("button");
    const occupied = [27, 28, 35, 36];
    for (const index of occupied) {
      expect(buttons[index].querySelector('[class*="disc"]')).not.toBeNull();
    }
    expect(buttons[0].querySelector('[class*="disc"]')).toBeNull();
  });
});
