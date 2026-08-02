# 04 — AI Architecture: Edax Wasm × Web Worker

Edax runs inside a dedicated Web Worker so the main thread — and the flip animation —
never blocks, even at the hardest difficulty. The UI talks to the worker through a small
typed protocol; nothing outside `src/ai/` knows Edax exists.

```
GameScreen ──(async getBestMove)── aiClient ──postMessage── edax.worker ── Edax (Wasm)
     ▲                                                          │
     └── store.play(move) ◄──────── bestMove message ◄──────────┘
```

## 1. Files

| File                  | Role |
| --------------------- | ---- |
| `src/ai/protocol.ts`  | Message types shared by both sides (pure types only). |
| `src/ai/difficulty.ts`| `Difficulty` → Edax search level. Pure, unit-testable. |
| `src/ai/edax.worker.ts` | Worker entry: loads the Emscripten module + `eval.dat`, answers `search` requests. |
| `src/ai/aiClient.ts`  | Main-thread wrapper: lazy worker creation, promise-based API, requestId bookkeeping, timeout. |

Worker construction uses Vite's native pattern (no plugin needed):
`new Worker(new URL("./edax.worker.ts", import.meta.url), { type: "module" })`.

## 2. Protocol (`src/ai/protocol.ts`)

```ts
export type MainToWorker =
  | { type: "init" }                       // load wasm + eval.dat, warm up engine
  | { type: "search";
      requestId: number;
      board: number[];                     // Board serialized (structured clone)
      turn: Player;
      level: number };                     // Edax level from difficulty.ts

export type WorkerToMain =
  | { type: "ready" }
  | { type: "bestMove"; requestId: number; move: number }   // 0..63
  | { type: "error"; fatal: boolean; message: string };
```

Rules:
- Exactly one `ready` or one fatal `error` follows `init`.
- Exactly one `bestMove` or `error` follows each `search`, tagged with its `requestId`.
- The engine is single-flight: the client never sends a second `search` before the
  previous one resolves (game flow guarantees this; the client also asserts it).
- Edax never has to pass or resign here: the client only asks when the AI has at least
  one legal move (the store's pass logic runs first, spec 03 §4), and a returned move is
  validated against `getLegalMoves` before playing — an out-of-range or illegal reply is
  treated as an `error`.

## 3. Difficulty mapping (`src/ai/difficulty.ts`)

Edax "level" is its midgame search depth (endgame solving scales with it).

```ts
export function edaxLevel(d: Difficulty): number;
// easy → 1   (instant, makes visible mistakes — beatable by beginners)
// normal → 5 (club-beginner strength, sub-second on phones)
// hard → 11  (strong; may take a few seconds late midgame)
```

Values are constants in one place so tuning after real-device testing is a one-line
change. On top of the engine reply, `aiClient` enforces a **minimum thinking time of
600 ms** (`Promise.all` with a delay): instant replies feel like a spreadsheet, not an
opponent.

## 4. `aiClient` API (main thread)

```ts
export function createAiClient() {
  init(): Promise<void>;      // idempotent; creates worker on first call, resolves on "ready"
  getBestMove(board: Board, turn: Player, level: number): Promise<number>;
  cancel(): void;             // invalidate in-flight request (bump requestId, resolve nobody)
  dispose(): void;            // terminate() the worker
}
```

- **requestId guard**: `cancel()` (called on quit/restart, spec 01 §4) bumps the current
  id; a later `bestMove` with a stale id is dropped. This is what makes "quit mid-search
  then start a new game" safe. The `getBestMove` promise for the cancelled request is
  deliberately left unsettled (never resolved or rejected) — the caller (GameScreen's
  effect, spec §5) is being torn down or re-triggered anyway, so there is nothing useful
  to do with a settlement. Do not "fix" this into a rejection; that would just surface a
  spurious error for a user-initiated cancel.
- **Timeout**: `getBestMove` rejects after 30 s (hard search should never approach this;
  a hung Wasm call must not hang the game). Rejection is handled like a worker error.
- `dispose()` is wired to GameScreen's `onCleanup`.

## 5. Game flow integration (GameScreen)

- On mount in AI mode: `init()` starts immediately (board renders while loading; if the
  human moves first the engine is typically ready before it is needed).
- A `createEffect` watches `(store.turn, store.animating, store.status)`:
  when `status === "playing"`, `turn` is the AI color, and `animating` is false →
  set `thinking = true`, `await getBestMove(...)`, validate, `store.play(move)`,
  `thinking = false`. The effect re-runs naturally after pass handling, so AI-then-human-
  passes-then-AI-again chains need no special code.
- While `thinking`: board input is disabled (`Board.disabled`), TurnIndicator pulses
  "Thinking…". The flip animation of the *human's* move has already finished before the
  effect fires (`animating` gate), so search overlaps only idle time.
- If the in-game menu opens during a search, the search continues but its result is
  applied only after the menu closes (simple check before `store.play`; if the player
  chose Restart/Quit, `cancel()` already invalidated it).

## 6. Failure handling (visible, never silent)

| Failure | Behavior |
| ------- | -------- |
| `init` fails (fetch 404, wasm compile error, no-Worker env) | `aiAvailable = false` at App level → title screen disables "Versus Computer" with an inline note. A game already on screen shows an error banner with "Back to Title". |
| `search` error / timeout / illegal reply | One automatic retry; on second failure show a blocking overlay: "The computer opponent crashed." with Back to Title. No random-move fallback — silent weak play is worse than an honest error. |
| Worker killed mid-game (e.g. tab resource pressure) | Surfaces as timeout → same as above. |

## 7. Worker internals (`edax.worker.ts`)

Sketch — exact exported function names are fixed by the build (spec 05 §3) and must be
kept in sync with `scripts`/docs there:

```ts
let engine: EdaxModule | null = null;

onmessage = async ({ data }: MessageEvent<MainToWorker>) => {
  switch (data.type) {
    case "init": {
      const factory = (await import(/* @vite-ignore */ "/edax/edax.js")).default;
      engine = await factory({ locateFile: (f) => `/edax/${f}` });
      //   eval.dat is fetched and written into the Emscripten FS before engine init
      //   completes (details + exact mechanism in spec 05 §3).
      postMessage({ type: "ready" });
      break;
    }
    case "search": {
      // 1. convert board(number[64]) + turn to Edax's board text format
      // 2. set position & level, run the search (synchronous inside the worker — fine)
      // 3. convert Edax's move (e.g. "d3") back to 0..63
      postMessage({ type: "bestMove", requestId: data.requestId, move });
      break;
    }
  }
};
```

- Board→Edax conversion: 64-char string (`X`/black, `O`/white, `-`/empty, a1 = index 0,
  reading order) plus the side to move — the format Edax's `setboard` accepts. The
  converters (`boardToEdax`, `moveToIndex`) are pure functions in the worker file and
  unit-tested (they run fine under Vitest without the Wasm module).
- All `case` bodies are wrapped in try/catch → `postMessage({type:"error", ...})`.

## 8. Acceptance criteria (M4 exit)

- During AI search at `hard`, dragging/scrolling the page and the previous flip
  animation stay at full frame rate (search runs off-main-thread).
- Each difficulty completes a full game; `easy` is beatable by a casual player,
  `hard` consistently beats `easy` (sanity: run one scripted AI-vs-AI game in dev).
- Quit to title mid-search, immediately start a new AI game: no stale move ever lands
  (requestId guard observable via a temporary debug log).
- With `public/edax/` renamed away, the app boots, PvP works, and "Versus Computer" is
  disabled with the inline note.
- Unit tests: `difficulty.ts` mapping, `boardToEdax`, `moveToIndex`, and a mocked-worker
  test of `aiClient`'s requestId/cancel logic.
