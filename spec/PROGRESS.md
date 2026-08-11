# Implementation Progress

One line item = one `ship-next-task` run = one commit. Ordered per `blueprint.md`'s
roadmap (M1 → M5); items within a milestone are ordered by dependency, except that the
binary-independent M4 items are pulled before M3 — they don't need `public/edax/`, and
this keeps the automated loop making progress right up to the one step it can't do
itself (see below).

**`[MANUAL]` items require a human** (installing Emscripten, running a multi-hour C
build, verifying licensing) and cannot be safely attempted by the automated loop. When
`ship-next-task` reaches one, it stops and reports it instead of attempting it — a
person must do the work and check the box before the loop can continue past it.

## M1 — Core rules (spec 03, pure part)

- [x] `src/logic/types.ts`: `Player`, `CellValue`, `Board`, `Difficulty`, `GameConfig`
- [x] `src/logic/rules.ts`: `initialBoard`, `opponent`, `getFlips`, `getLegalMoves`,
      `applyMove`, `countDiscs`, `progressAfter`
- [x] `src/logic/rules.test.ts`: the 15 pure-function cases from spec 03 §5 (1–15)

## M2 — Screens and visuals, PvP playable (specs 01, 02, 03 store part)

- [x] `src/index.css`: reset + design tokens (spec 02 §2)
- [x] `Disc` component + 3D flip CSS (spec 02 §4)
- [x] `Board` component: grid, star points, legal-move hints, last-move marker (spec 02 §3)
- [x] `createGameStore.ts` + store tests (spec 03 §4, test cases 16–19)
- [x] `TurnIndicator` component (spec 02 §6)
- [x] `GameScreen`: wires store + Board + TurnIndicator for PvP play
- [x] `InGameMenu` (Kobalte `Dialog`) (spec 01 §3, spec 02 §6)
- [x] `ResultOverlay` (Kobalte `Dialog`, personalized AI-mode text) (spec 01 §3, spec 02 §6)
- [x] `TitleScreen`: main menu + aiSetup step (Kobalte `RadioGroup` for difficulty/color)
      (spec 01 §2, spec 02 §5)
- [x] `GameScreen`: wire `InGameMenu` + `ResultOverlay` (menu button, local
      `menuOpen` signal, Resume/Restart/Quit and Rematch/Back-to-Title actions) —
      split out because spec 01 §4's transition table rows 5-11 and spec 01 §5's
      acceptance criteria aren't reachable without this, and the original
      `App.tsx` task alone can't satisfy them (spec 01 §1, §3, §4, spec 02 §6)
- [x] `App.tsx`: screen switching signal (spec 01 §1, §4)

## M4a — AI protocol & client, no binaries needed (spec 04)

- [x] `src/ai/protocol.ts`: `MainToWorker` / `WorkerToMain` types
- [x] `src/ai/difficulty.ts` + tests
- [x] `src/ai/edax.worker.ts` + `boardToEdax`/`moveToIndex` unit tests (pure
      converters only — the Wasm engine call itself is exercised in M4b)
- [x] `src/ai/aiClient.ts` + mocked-worker requestId/cancel tests

## M3 — Edax assets (spec 05)

- [x] **[MANUAL]** Obtain/build `edax.js` + `edax.wasm` + `eval.dat`, place under
      `public/edax/` with `LICENSE` and `README.md` (spec 05 §1–4) — built from
      upstream `abulmo/edax-reversi` (Plan B, spec 05 §3's fallback route; the
      recommended `libedax` fork turned out to be iOS/UIKit-only, not portable
      to Wasm); see `public/edax/README.md` for the full reproduction record
- [x] **[MANUAL]** Isolated smoke test of the build (spec 05 §3 note 4) before app
      integration — verified via Node at levels 1/5/11 and with white to move;
      see `public/edax/README.md`

## M4b — AI integration wiring, needs real binaries to verify end-to-end (spec 04)

- [x] `GameScreen`: AI orchestration effect (spec 04 §5)
- [x] `TitleScreen`: AI setup wiring + `aiAvailable` disabled state (spec 04 §6)
      <!-- PLAUSIBLE (unresolved): App.test.tsx's MockWorker/TrackedMockWorker is
           now duplicated a third time (also in aiClient.test.ts and
           GameScreen.test.tsx) - a candidate for a shared test util, not fixed
           here per CLAUDE.md's guidance to leave PLAUSIBLE findings unresolved. -->


## M5 — Polish pass

- [x] `prefers-reduced-motion` handling (spec 02 §4, §8)
- [ ] Focus/keyboard access audit on menus and controls
- [ ] Visual checklist pass (spec 02 §8) and final `pnpm check` / `pnpm test` green
