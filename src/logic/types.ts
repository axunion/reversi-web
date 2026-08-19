export type Player = 1 | 2; // 1 = black (moves first), 2 = white
export type CellValue = 0 | Player; // 0 = empty
export type Board = readonly CellValue[]; // length 64, index = row * 8 + col
export type Difficulty = "easy" | "casual" | "normal" | "hard" | "expert";
export type GameConfig =
  | { mode: "pvp" }
  | { mode: "ai"; difficulty: Difficulty; playerColor: Player };
