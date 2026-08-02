# 03 — Core Game Logic

The rules of Reversi as pure, tested TypeScript, plus the thin Solid store that
sequences moves, animations, passes, and game over. The pure layer never imports Solid;
the store never re-implements a rule.

## 1. Data model (`src/logic/types.ts`)

```ts
export type Player = 1 | 2;              // 1 = black (moves first), 2 = white
export type CellValue = 0 | Player;      // 0 = empty
export type Board = readonly CellValue[]; // length 64, index = row * 8 + col
export type Difficulty = "easy" | "normal" | "hard";
export type GameConfig =
  | { mode: "pvp" }
  | { mode: "ai"; difficulty: Difficulty; playerColor: Player };
```

A flat 64-length array is used everywhere (logic, store, worker protocol): trivially
serializable through `postMessage`, cheap to copy, and index math is one multiply.
Helper constants in `rules.ts`: `SIZE = 8`, the 8 direction offsets expressed as
`(dr, dc)` pairs (row/col deltas — **not** flat-index deltas, so edge wrap-around bugs
are impossible; bounds are checked on `(r, c)` before flattening).

## 2. Pure rule functions (`src/logic/rules.ts`)

All functions are pure, take `Board` first, and return new arrays (no mutation).

```ts
export function initialBoard(): Board;
// d4=white(2), e4=black(1), d5=black(1), e5=white(2) — i.e.
// index 27=2, 28=1, 35=1, 36=2; everything else 0.

export function opponent(p: Player): Player;

export function getFlips(board: Board, p: Player, index: number): number[];
// All opponent disc indices flipped if p plays at `index`.
// [] when the cell is occupied or the move captures nothing (=> illegal).

export function getLegalMoves(board: Board, p: Player): number[];
// Indices where getFlips(...).length > 0.

export function applyMove(board: Board, p: Player, index: number): {
  board: Board;          // new board with the move and all flips applied
  flips: number[];       // what changed (for animation staggering)
};
// Precondition: the move is legal; throws on an illegal move (programmer error).

export function countDiscs(board: Board): { black: number; white: number };

export type Progress =
  | { kind: "play"; turn: Player }          // `turn` has at least one legal move
  | { kind: "pass"; turn: Player }          // mover must pass; `turn` is who plays instead
  | { kind: "gameOver"; winner: Player | "draw" };

export function progressAfter(board: Board, mover: Player): Progress;
// Given that `mover` just moved (or the game just started with mover = white,
// so black is examined first): decides whether the next player plays, must be
// skipped (pass), or the game is over (neither side can move — includes the
// full-board case). Winner by disc count.
```

`progressAfter` centralizes pass and game-over rules so the store contains no rule
logic — it just switches on `Progress`.

## 3. Rule details encoded above

- A move is legal iff it lands on an empty cell **and** flips ≥ 1 disc.
- Flips accumulate over all 8 directions; each direction contributes its run of opponent
  discs only when terminated by the mover's own disc (not an edge, not an empty cell).
- If the player to move has no legal move but the opponent has, the turn passes (a game
  may contain several consecutive-ish passes over its course).
- The game ends when **neither** player has a legal move (covers the full-board case and
  early wipe-outs / blocked positions). Winner has more discs; equal is a draw.

## 4. Solid store (`src/screens/GameScreen/createGameStore.ts`)

```ts
export function createGameStore(config: GameConfig) {
  // createStore-backed state
  state: {
    board: Board;
    turn: Player;
    status: "playing" | "ended";
    winner: Player | "draw" | null;
    lastMove: number | null;
    flipDelays: Record<number, number>;  // disc index -> ms, for the current move only
    passMessage: Player | null;          // who just passed (drives the 1s toast)
    thinking: boolean;                   // AI search in flight (set by GameScreen)
    animating: boolean;                  // input lock while flips play out
  };
  // derived (createMemo)
  legalMoves: () => number[];            // for state.turn, [] when not "playing"
  score: () => { black: number; white: number };
  // actions
  play(index: number): void;             // ignore if illegal / animating / ended
  reset(): void;                         // back to initialBoard, black to move
}
```

`play(index)` sequence (the only nontrivial flow):

1. Guard: `status === "playing"`, not `animating`, `index ∈ legalMoves()`.
2. `applyMove` → set `board`, `lastMove`, and `flipDelays`
   (`chebyshevDistance(flip, index) * FLIP_STAGGER_MS` per flipped disc, placed disc 0).
3. Set `animating = true`; after the longest delay + flip duration (one `setTimeout`,
   cleared via `onCleanup`), set `animating = false` and continue:
4. `progressAfter(board, mover)`:
   - `play` → `turn = next`.
   - `pass` → set `passMessage` (auto-clears after ~1s timer), `turn = progress.turn`.
   - `gameOver` → `status = "ended"`, `winner` set.

Whose turn triggers the AI, and when, is GameScreen's job (spec 04 §5) — the store is
mode-agnostic and identical for PvP and AI games. Animation timing constants live next
to the CSS tokens they mirror (`FLIP_DURATION_MS`, `FLIP_STAGGER_MS` exported from the
store file; CSS custom properties are set from these via inline style on the board root
so the numbers exist in exactly one place).

## 5. Test list (`src/logic/rules.test.ts`) — the M1 exit criteria

Write these with the implementation; all must pass via `pnpm test`.

**initialBoard / countDiscs**
1. Initial board has exactly the four center discs in the standard pattern; count 2–2.

**getFlips / getLegalMoves**
2. Opening: black's legal moves are exactly {d3, c4, f5, e6} (indices 19, 26, 37, 44).
3. Opening: `getFlips(black, 19)` (d3) = [27] (d4 flips).
4. Occupied cell → `[]`; empty cell with no capture → `[]`.
5. Multi-direction capture: hand-built position where one move flips in 3 directions;
   the union is returned.
6. Runs ending at the board edge without a friendly terminator flip nothing
   (edge wrap-around regression guard: e.g. a run along row 0 crossing the h→a seam
   must not flip).
7. A run interrupted by an empty cell flips nothing in that direction.
8. Corner capture works (a1 capturing along a row, a column, and a diagonal).

**applyMove**
9. Returns a new board (input board unchanged); placed cell and all flips set to mover.
10. Throws on an illegal move.

**progressAfter**
11. Normal case: opponent has moves → `{kind:"play"}`.
12. Pass: position where white has no move but black does → after black moves into it,
    `{kind:"pass", turn: black}`.
13. Game over, full board: 64 discs → `gameOver` with correct winner by count.
14. Game over, early: position where neither side can move with empty cells remaining
    (e.g. one color wiped out) → `gameOver`.
15. Draw: constructed 32–32 full board → `winner: "draw"`.

**store (happy-dom, `createRoot`)**
16. `play` on a legal move updates board and eventually hands the turn over
    (use fake timers to skip animation waits).
17. `play` on an illegal cell or while `animating` is a no-op.
18. Double-pass position reaches `status "ended"` without user input beyond the last
    legal move.
19. `reset()` restores the opening position and black's turn.

Positions for tests 5–15 are built with a small test helper
`boardFrom(ascii: string): Board` (8 lines of `.`, `B`, `W`) local to the test file —
readable fixtures beat index lists.

## 6. Acceptance criteria

- `pnpm test` green with the 19 cases above; `pnpm check` clean.
- `rules.ts` has no imports from Solid or the DOM; `createGameStore.ts` imports rules
  but contains no direction/flip arithmetic of its own.
