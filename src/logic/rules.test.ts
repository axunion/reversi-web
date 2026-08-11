import { describe, expect, it } from "vitest";
import {
  applyMove,
  countDiscs,
  getFlips,
  getLegalMoves,
  initialBoard,
  opponent,
  progressAfter,
} from "./rules";
import type { Board, CellValue } from "./types";

function boardFrom(ascii: string): Board {
  const rows = ascii
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const cells: CellValue[] = [];

  for (const row of rows) {
    for (const ch of row) {
      if (ch === "B") cells.push(1);
      else if (ch === "W") cells.push(2);
      else cells.push(0);
    }
  }

  return cells;
}

describe("initialBoard / countDiscs", () => {
  it("has exactly the four center discs in the standard pattern; count 2-2", () => {
    const board = initialBoard();

    expect(board[27]).toBe(2);
    expect(board[28]).toBe(1);
    expect(board[35]).toBe(1);
    expect(board[36]).toBe(2);
    expect(board.filter((cell) => cell !== 0)).toHaveLength(4);
    expect(countDiscs(board)).toEqual({ black: 2, white: 2 });
  });
});

describe("opponent", () => {
  it("returns the other player", () => {
    expect(opponent(1)).toBe(2);
    expect(opponent(2)).toBe(1);
  });
});

describe("getFlips / getLegalMoves", () => {
  it("opening: black's legal moves are exactly d3, c4, f5, e6", () => {
    const moves = getLegalMoves(initialBoard(), 1).sort((a, b) => a - b);
    expect(moves).toEqual([19, 26, 37, 44]);
  });

  it("opening: getFlips(black, d3) flips d4", () => {
    expect(getFlips(initialBoard(), 1, 19)).toEqual([27]);
  });

  it("occupied cell -> []; empty cell with no capture -> []", () => {
    expect(getFlips(initialBoard(), 1, 27)).toEqual([]);
    expect(getFlips(initialBoard(), 1, 0)).toEqual([]);
  });

  it("multi-direction capture returns the union of all flipped directions", () => {
    const board = boardFrom(`
      ........
      ........
      ..B.B...
      ...WW...
      ..BW....
      ........
      ........
      ........
    `);

    const flips = getFlips(board, 1, 36).sort((a, b) => a - b);
    expect(flips).toEqual([27, 28, 35]);
  });

  it("a run ending at the board edge without a friendly terminator flips nothing", () => {
    const board = boardFrom(`
      ......WW
      B.......
      ........
      ........
      ........
      ........
      ........
      ........
    `);

    expect(getFlips(board, 1, 5)).toEqual([]);
  });

  it("a run interrupted by an empty cell flips nothing in that direction", () => {
    const board = boardFrom(`
      .W.B....
      ........
      ........
      ........
      ........
      ........
      ........
      ........
    `);

    expect(getFlips(board, 1, 0)).toEqual([]);
  });

  it("corner capture works along a row, a column, and a diagonal", () => {
    const board = boardFrom(`
      .WB.....
      WW......
      B.B.....
      ........
      ........
      ........
      ........
      ........
    `);

    const flips = getFlips(board, 1, 0).sort((a, b) => a - b);
    expect(flips).toEqual([1, 8, 9]);
  });
});

describe("applyMove", () => {
  it("returns a new board with the placed cell and flips set to the mover", () => {
    const board = initialBoard();
    const { board: next, flips } = applyMove(board, 1, 19);

    expect(flips).toEqual([27]);
    expect(next[19]).toBe(1);
    expect(next[27]).toBe(1);
    expect(board[19]).toBe(0);
    expect(board[27]).toBe(2);
    expect(next).not.toBe(board);
  });

  it("throws on an illegal move", () => {
    expect(() => applyMove(initialBoard(), 1, 27)).toThrow();
  });
});

describe("progressAfter", () => {
  it("normal case: opponent has moves -> play", () => {
    expect(progressAfter(initialBoard(), 2)).toEqual({ kind: "play", turn: 1 });
  });

  it("pass: white has no move but black does, so black moves again", () => {
    const board = boardFrom(`
      ......WB
      ........
      ........
      ........
      ........
      ........
      ........
      BW......
    `);

    const { board: next } = applyMove(board, 1, 5);
    expect(progressAfter(next, 1)).toEqual({ kind: "pass", turn: 1 });
  });

  it("game over, full board: winner decided by disc count", () => {
    const board = boardFrom(`
      BBBBBBBB
      BBBBBBBB
      BBBBBBBB
      BBBBBBBB
      BBBBBBBB
      WWWWWWWW
      WWWWWWWW
      WWWWWWWW
    `);

    expect(progressAfter(board, 1)).toEqual({ kind: "gameOver", winner: 1 });
  });

  it("game over, early: neither side can move with empty cells remaining", () => {
    const board = boardFrom(`
      BBB.....
      BBB.....
      BBB.....
      ........
      ........
      ........
      ........
      ........
    `);

    expect(progressAfter(board, 2)).toEqual({ kind: "gameOver", winner: 1 });
  });

  it("draw: a full 32-32 board", () => {
    const board = boardFrom(`
      BBBBBBBB
      BBBBBBBB
      BBBBBBBB
      BBBBBBBB
      WWWWWWWW
      WWWWWWWW
      WWWWWWWW
      WWWWWWWW
    `);

    expect(progressAfter(board, 1)).toEqual({
      kind: "gameOver",
      winner: "draw",
    });
  });
});
