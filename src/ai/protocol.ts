import type { Player } from "../logic/types";

export type MainToWorker =
  | { type: "init" } // load wasm + eval.dat, warm up engine
  | {
      type: "search";
      requestId: number;
      board: number[]; // Board serialized (structured clone)
      turn: Player;
      level: number; // Edax level from difficulty.ts
    };

export type WorkerToMain =
  | { type: "ready" }
  | { type: "bestMove"; requestId: number; move: number } // 0..63
  | { type: "error"; fatal: boolean; message: string; requestId?: number }; // requestId present iff the error is a reply to a "search"
