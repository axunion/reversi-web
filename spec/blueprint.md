# Reversi Web — Master Blueprint

Technical blueprint for a browser Reversi game with local PvP and AI (Edax/Wasm) play.
This document is the entry point: it fixes the goal, the stack, and the target file
layout. Details live in the numbered specs listed below.

## 1. Goal

A minimal, high-quality MVP of a Reversi game that runs entirely in the browser:

- **Local PvP**: two players share one device.
- **AI play**: against the Edax engine (C, compiled to WebAssembly) at three difficulties.
- **Console-game feel**: a polished title screen, a distraction-free board during play,
  and rich CSS-only visuals (glossy discs, 3D flip animation, felt-green board).

### Non-goals (do not design or implement)

- No backend server, database, user accounts, or persistence of any kind.
- No online play (WebSocket, WebRTC, etc.).
- No i18n framework, no theming system, no plugin architecture.
- No routing library — screen state is a plain Solid signal.

## 2. Fixed tech stack

Already scaffolded in this repo; do not add or replace tooling.

| Concern    | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | SolidJS 1.9 on Vite (vite-plugin-solid)             |
| Language   | TypeScript (strict)                                 |
| Styling    | CSS Modules (`*.module.css`, lightningcss)          |
| Testing    | Vitest + happy-dom (`pnpm test`)                    |
| Lint/format| Biome (`pnpm check` / `pnpm fix`)                   |
| UI primitives | `@kobalte/core` (headless Dialog, RadioGroup) + `lucide-solid` (icons) — see spec 02 §6 |
| AI engine  | Edax compiled to Wasm, run inside a Web Worker      |

## 3. Target directory layout

```
public/
  edax/
    edax.js          # Emscripten JS glue (ES module)
    edax.wasm        # engine binary
    eval.dat         # evaluation weights
src/
  index.tsx          # entry, unchanged apart from imports
  index.css          # global reset + design tokens (CSS custom properties)
  App.tsx            # screen switching only (title <-> game)
  screens/
    TitleScreen/
      TitleScreen.tsx
      TitleScreen.module.css
    GameScreen/
      GameScreen.tsx           # owns the game store and AI orchestration
      GameScreen.module.css
      createGameStore.ts       # Solid store wrapping src/logic
  components/
    Board/
      Board.tsx                # grid + cells + discs + star points
      Board.module.css
    Disc/
      Disc.tsx                 # two-faced 3D disc
      Disc.module.css
    InGameMenu/
      InGameMenu.tsx           # hidden menu: resume / restart / quit to title
      InGameMenu.module.css
    ResultOverlay/
      ResultOverlay.tsx        # final score, rematch / back to title
      ResultOverlay.module.css
    TurnIndicator/
      TurnIndicator.tsx        # minimal turn + score strip, AI "thinking" state
      TurnIndicator.module.css
  logic/
    types.ts         # Player, Board, GameConfig, ... (pure types)
    rules.ts         # pure rule functions (no Solid imports)
    rules.test.ts
  ai/
    protocol.ts      # worker message types (discriminated unions)
    difficulty.ts    # Difficulty -> Edax level mapping
    aiClient.ts      # promise-based wrapper around the worker
    edax.worker.ts   # Web Worker: loads Edax Wasm, answers search requests
```

One concern per file; keep files under ~300 lines.

## 4. Detail specs (read the one you are implementing)

| Doc | Scope |
| --- | ----- |
| [01-screens.md](./01-screens.md) | Screen flow and app-level state: title → game → result → retry/quit, as a typed state machine on a single signal. No router. |
| [02-components.md](./02-components.md) | Component tree, props, and CSS Modules design: design tokens, board/disc visuals, the 3D flip animation classes, responsive layout, in-game menu. |
| [03-core-logic.md](./03-core-logic.md) | Core game rules as pure TypeScript (board array, legal moves, flips, pass, game over) plus the Solid store that animates and sequences them. Includes the full Vitest test list — tests are the success criteria. |
| [04-ai-worker.md](./04-ai-worker.md) | Edax Wasm × Web Worker architecture: message protocol, difficulty mapping, thinking-state UX, load/error handling. |
| [05-edax-build.md](./05-edax-build.md) | How to obtain/build `edax.wasm` + `eval.dat` with Emscripten and where to place them. |

## 5. Conventions for the implementing AI

- Pure logic (`src/logic`, `src/ai/difficulty.ts`, `src/ai/protocol.ts`) never imports
  Solid; UI files never re-implement rules.
- All user-facing strings are English (per repo language rule).
- Write tests before or alongside each pure-logic function; UI is verified by playing
  the app, not by snapshot tests.
- Do not introduce dependencies beyond what `package.json` already lists.
