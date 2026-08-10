import { SIZE } from "../logic/rules";
import type { Player } from "../logic/types";
import type { MainToWorker, WorkerToMain } from "./protocol";

// Symbol names exported by the libedax build (spec 05 §1 note 1). These are
// placeholders — replace them with the real names from the chosen libedax
// fork's header once the M3 build (spec 05) produces edax.js/edax.wasm, and
// keep this list in sync with that build.
const EDAX_SYMBOLS = {
  initialize: "libedax_initialize",
  setBoard: "libedax_set_board",
  setLevel: "libedax_set_level",
  search: "libedax_search",
} as const;

type EdaxModule = {
  ccall: (
    name: string,
    returnType: string,
    argTypes: string[],
    args: unknown[],
  ) => unknown;
  FS: { writeFile: (path: string, data: Uint8Array) => void };
};

type EdaxFactory = (options?: {
  locateFile?: (path: string) => string;
}) => Promise<EdaxModule>;

// edax.js is a runtime-only asset produced by the M3 build (spec 05); it
// doesn't exist in the repo (or as a resolvable module) until then. Reading
// the path through a variable, rather than a string literal, keeps tsc from
// trying to resolve it as a module at build time.
const EDAX_MODULE_PATH = "/edax/edax.js";

let engine: EdaxModule | null = null;

export function boardToEdax(board: readonly number[], turn: Player): string {
  const cells = board
    .map((cell) => (cell === 1 ? "X" : cell === 2 ? "O" : "-"))
    .join("");
  const side = turn === 1 ? "X" : "O";
  return `${cells} ${side}`;
}

export function moveToIndex(move: string): number {
  const col = move.charCodeAt(0) - "a".charCodeAt(0);
  const row = Number(move[1]) - 1;
  return row * SIZE + col;
}

function post(message: WorkerToMain): void {
  postMessage(message);
}

self.onmessage = async ({ data }: MessageEvent<MainToWorker>) => {
  try {
    switch (data.type) {
      case "init": {
        const [factory, evalData] = await Promise.all([
          import(/* @vite-ignore */ EDAX_MODULE_PATH).then(
            (mod) => mod.default as EdaxFactory,
          ),
          fetch("/edax/eval.dat").then((res) => res.arrayBuffer()),
        ]);
        engine = await factory({ locateFile: (f: string) => `/edax/${f}` });
        // eval.dat must be in the Emscripten FS before the engine init call below
        // (spec 05 §2) — Edax reads it from there during initialization.
        engine?.FS.writeFile("data/eval.dat", new Uint8Array(evalData));
        engine?.ccall(EDAX_SYMBOLS.initialize, "void", [], []);
        post({ type: "ready" });
        break;
      }
      case "search": {
        if (!engine) throw new Error("Engine not initialized");
        const position = boardToEdax(data.board, data.turn);
        engine.ccall(EDAX_SYMBOLS.setBoard, "void", ["string"], [position]);
        engine.ccall(EDAX_SYMBOLS.setLevel, "void", ["number"], [data.level]);
        const notation = engine.ccall(
          EDAX_SYMBOLS.search,
          "string",
          [],
          [],
        ) as string;
        post({
          type: "bestMove",
          requestId: data.requestId,
          move: moveToIndex(notation),
        });
        break;
      }
    }
  } catch (error) {
    post({
      type: "error",
      fatal: data.type === "init",
      message: error instanceof Error ? error.message : String(error),
      requestId: data.type === "search" ? data.requestId : undefined,
    });
  }
};
