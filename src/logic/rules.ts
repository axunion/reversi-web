import type { Board, CellValue, Player } from "./types";

export const SIZE = 8;

const DIRECTIONS: readonly [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function initialBoard(): Board {
  const cells: CellValue[] = new Array(SIZE * SIZE).fill(0);
  cells[27] = 2;
  cells[28] = 1;
  cells[35] = 1;
  cells[36] = 2;
  return cells;
}

export function opponent(p: Player): Player {
  return p === 1 ? 2 : 1;
}

export function getFlips(board: Board, p: Player, index: number): number[] {
  if (board[index] !== 0) return [];

  const other = opponent(p);
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const flips: number[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const run: number[] = [];
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      const cellIndex = r * SIZE + c;
      const cell = board[cellIndex];

      if (cell === other) {
        run.push(cellIndex);
      } else if (cell === p) {
        flips.push(...run);
        break;
      } else {
        break;
      }

      r += dr;
      c += dc;
    }
  }

  return flips;
}

export function getLegalMoves(board: Board, p: Player): number[] {
  const moves: number[] = [];

  for (let index = 0; index < board.length; index++) {
    if (getFlips(board, p, index).length > 0) {
      moves.push(index);
    }
  }

  return moves;
}

export function applyMove(
  board: Board,
  p: Player,
  index: number,
): { board: Board; flips: number[] } {
  const flips = getFlips(board, p, index);
  if (flips.length === 0) {
    throw new Error(`Illegal move: player ${p} at index ${index}`);
  }

  const next = board.slice();
  next[index] = p;
  for (const flip of flips) {
    next[flip] = p;
  }

  return { board: next, flips };
}

export function countDiscs(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;

  for (const cell of board) {
    if (cell === 1) black++;
    else if (cell === 2) white++;
  }

  return { black, white };
}

export type Progress =
  | { kind: "play"; turn: Player }
  | { kind: "pass"; turn: Player }
  | { kind: "gameOver"; winner: Player | "draw" };

export function progressAfter(board: Board, mover: Player): Progress {
  const next = opponent(mover);

  if (getLegalMoves(board, next).length > 0) {
    return { kind: "play", turn: next };
  }

  if (getLegalMoves(board, mover).length > 0) {
    return { kind: "pass", turn: mover };
  }

  const { black, white } = countDiscs(board);
  if (black === white) return { kind: "gameOver", winner: "draw" };
  return { kind: "gameOver", winner: black > white ? 1 : 2 };
}
