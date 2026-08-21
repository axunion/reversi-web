import { SIZE } from "../logic/rules";
import type { Player } from "../logic/types";
import type { MainToWorker, WorkerToMain } from "./protocol";

type EdaxModule = {
  FS: {
    mkdir: (path: string) => void;
    writeFile: (path: string, data: Uint8Array) => void;
  };
  callMain: (args: string[]) => void;
};

type EdaxModuleOptions = {
  noInitialRun?: boolean;
  locateFile?: (path: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  stdin?: () => number | null;
  preRun?: ((module: EdaxModule) => void)[];
};

type EdaxFactory = (options: EdaxModuleOptions) => Promise<EdaxModule>;

// edax.js is a runtime-only asset under public/ (public/edax/README.md), not
// part of the app's module graph, so it can't be a plain `import("/edax/edax.js")`:
// Vite's dev server explicitly rejects import()-ing files under public/ ("should
// not be imported from source code... can only be referenced via HTML tags"),
// and @vite-ignore doesn't suppress that check inside a Worker bundle. Fetching
// the script as text and import()-ing it as a Blob URL sidesteps Vite's module
// graph entirely, in both dev and production. locateFile must then be set
// explicitly, since the module's import.meta.url is the blob: URL, not
// /edax/edax.js, so Emscripten's default same-directory .wasm lookup breaks.
async function loadEdaxFactory(): Promise<EdaxFactory> {
  const source = await fetch("/edax/edax.js").then((res) => res.text());
  const blobUrl = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" }),
  );
  try {
    const mod = await import(/* @vite-ignore */ blobUrl);
    return mod.default as EdaxFactory;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function locateFile(path: string): string {
  return `/edax/${path}`;
}

let edaxFactory: EdaxFactory | null = null;
let evalData: ArrayBuffer | null = null;

export function boardToEdax(board: readonly number[], turn: Player): string {
  const cells = board
    .map((cell) => (cell === 1 ? "X" : cell === 2 ? "O" : "-"))
    .join("");
  const side = turn === 1 ? "X" : "O";
  return `${cells} ${side}`;
}

export function moveToIndex(move: string): number {
  const col = move.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);
  const row = Number(move[1]) - 1;
  return row * SIZE + col;
}

function post(message: WorkerToMain): void {
  postMessage(message);
}

// The build's EXIT_RUNTIME=1 runtime can't be reused across multiple
// callMain() calls, so each search gets a fresh module instance, driven
// through Edax's own text protocol via stdin/stdout (public/edax/README.md):
// setboard <board>, go, quit — then parse the "Edax plays <move>" reply.
async function runSearch(
  board: readonly number[],
  turn: Player,
  level: number,
): Promise<number> {
  if (!edaxFactory || !evalData) throw new Error("Engine not initialized");

  const commands = [`setboard ${boardToEdax(board, turn)}`, "go", "quit", ""];
  let commandIndex = 0;
  let charIndex = 0;
  let output = "";

  const evalBytes = evalData;
  const module = await edaxFactory({
    noInitialRun: true,
    locateFile,
    print: (text) => {
      output += `${text}\n`;
    },
    printErr: () => {},
    stdin: () => {
      if (commandIndex >= commands.length) return null; // EOF
      const line = commands[commandIndex];
      if (charIndex < line.length) return line.charCodeAt(charIndex++);
      commandIndex++;
      charIndex = 0;
      return 10; // '\n'
    },
    preRun: [
      (mod) => {
        mod.FS.mkdir("data");
        mod.FS.writeFile("data/eval.dat", new Uint8Array(evalBytes));
      },
    ],
  });

  module.callMain(["-l", String(level), "-verbose", "0"]);

  const match = output.match(/Edax plays ([a-hA-H][1-8])/);
  if (!match) throw new Error("Edax did not report a move");
  return moveToIndex(match[1]);
}

self.onmessage = async ({ data }: MessageEvent<MainToWorker>) => {
  try {
    switch (data.type) {
      case "init": {
        const [factory, evalBuffer] = await Promise.all([
          // Instantiate once (without running main) to surface a wasm compile
          // error at init time rather than on the first search (spec 04 §6);
          // chained onto the factory load itself so wasm fetch+compile
          // overlaps the eval.dat download instead of following it.
          loadEdaxFactory().then(async (factory) => {
            await factory({ noInitialRun: true, locateFile });
            return factory;
          }),
          fetch("/edax/eval.dat").then((res) => res.arrayBuffer()),
        ]);
        edaxFactory = factory;
        evalData = evalBuffer;
        post({ type: "ready" });
        break;
      }
      case "search": {
        const move = await runSearch(data.board, data.turn, data.level);
        post({ type: "bestMove", requestId: data.requestId, move });
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
