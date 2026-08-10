import { describe, expect, it } from "vitest";
import { initialBoard } from "../logic/rules";
import { boardToEdax, moveToIndex } from "./edax.worker";

describe("boardToEdax", () => {
  it("converts the opening position with black to move", () => {
    const cells = new Array(64).fill("-");
    cells[27] = "O";
    cells[28] = "X";
    cells[35] = "X";
    cells[36] = "O";

    expect(boardToEdax(initialBoard(), 1)).toBe(`${cells.join("")} X`);
  });

  it("appends O when white is to move", () => {
    expect(boardToEdax(initialBoard(), 2)).toMatch(/ O$/);
  });

  it("marks every empty cell as '-'", () => {
    const empty = new Array(64).fill(0);
    expect(boardToEdax(empty, 1)).toBe(`${"-".repeat(64)} X`);
  });

  it("maps individual cells to the matching output position, not just length/suffix", () => {
    const board = new Array(64).fill(0);
    board[0] = 1; // first cell: X
    board[63] = 2; // last cell: O
    board[10] = 2; // O surrounded by empties
    board[20] = 1; // X surrounded by empties

    const expected = new Array(64).fill("-");
    expected[0] = "X";
    expected[63] = "O";
    expected[10] = "O";
    expected[20] = "X";

    expect(boardToEdax(board, 1)).toBe(`${expected.join("")} X`);
  });
});

describe("moveToIndex", () => {
  it("converts a1 to index 0", () => {
    expect(moveToIndex("a1")).toBe(0);
  });

  it("converts d3 to index 19", () => {
    expect(moveToIndex("d3")).toBe(19);
  });

  it("converts h8 to index 63", () => {
    expect(moveToIndex("h8")).toBe(63);
  });

  it("converts every square on the board to row * 8 + col", () => {
    const columns = ["a", "b", "c", "d", "e", "f", "g", "h"];
    for (let row = 1; row <= 8; row++) {
      for (let col = 0; col < columns.length; col++) {
        const move = `${columns[col]}${row}`;
        expect(moveToIndex(move)).toBe((row - 1) * 8 + col);
      }
    }
  });

  it("accepts the uppercase column letter Edax's own output uses (e.g. 'D3')", () => {
    expect(moveToIndex("D3")).toBe(19);
  });
});
