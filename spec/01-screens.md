# 01 — Screen Flow & App State

How the app moves between the title screen and the game, with no routing library.
One typed signal in `App.tsx` is the single source of truth for "which screen".

## 1. Screen model

`Player`, `Difficulty`, and `GameConfig` are defined once, in `src/logic/types.ts`
(see spec 03 §1) — not repeated here.

```ts
// App-level screen state (App.tsx)
type Screen =
  | { name: "title" }
  | { name: "game"; config: GameConfig };
```

`App.tsx` holds `const [screen, setScreen] = createSignal<Screen>({ name: "title" })`
and renders with `<Switch>`/`<Match>`:

- `title` → `<TitleScreen onStart={config => setScreen({ name: "game", config })} />`
- `game` → `<GameScreen config={...} onQuit={() => setScreen({ name: "title" })} />`

`GameScreen` is keyed by object identity: starting a new game (rematch) recreates the
game store with the same `config` (see §4), it does not need a new `Screen` value.
`App.tsx` contains nothing else — no game state, no AI state.

## 2. Title screen flow

The title screen is a single component with an internal two-step menu
(`createSignal<"main" | "aiSetup">`):

```
┌───────────────────────────┐
│        R E V E R S I      │   game logo (pure CSS/typography)
│                           │
│      ▸ Two Players        │   → onStart({ mode: "pvp" })
│      ▸ Versus Computer    │   → step = "aiSetup"
└───────────────────────────┘

aiSetup step (replaces the main menu in place, with a back control):
│   Difficulty:  [Easy] [Normal] [Hard]
│   Play as:     [● Black (first)] [○ White]
│      ▸ Start Game          → onStart({ mode: "ai", difficulty, playerColor })
│      ‹ Back                → step = "main"
```

- Defaults: `normal`, black.
- If AI initialization previously failed permanently (see spec 04 §6), the
  "Versus Computer" entry renders disabled with a short inline note
  ("Computer opponent unavailable"). PvP always works.

## 3. Game screen states (owned by GameScreen, not App)

Inside a game, the phase lives in the game store (spec 03 §4):

```
status: "playing" | "ended"
menuOpen: boolean            // UI-local signal, not in the store
```

- **Result overlay is not a separate screen.** When `status === "ended"`, GameScreen
  renders `ResultOverlay` above the finished board (the board stays visible underneath,
  dimmed). This keeps the "review the final position" feel of console games.
- **In-game menu** (`InGameMenu`) is a modal overlay toggled by a single unobtrusive
  button (see spec 02 §6). While open, board input is disabled.

## 4. Transition table

| # | From                | Trigger                                | To / effect |
|---|---------------------|----------------------------------------|-------------|
| 1 | title (main)        | "Two Players"                          | game, `{mode:"pvp"}`, fresh store |
| 2 | title (main)        | "Versus Computer"                      | title (aiSetup step) |
| 3 | title (aiSetup)     | "Start Game"                           | game, `{mode:"ai",...}`, fresh store |
| 4 | title (aiSetup)     | "Back"                                 | title (main) |
| 5 | game (playing)      | menu button                            | menu overlay opens (game paused for input; AI search in flight continues but its result is deferred until the menu closes — see spec 04 §5) |
| 6 | game (menu open)    | "Resume"                               | menu closes |
| 7 | game (menu open)    | "Restart"                              | store reset with same config, menu closes |
| 8 | game (menu open)    | "Quit to Title"                        | `onQuit()` → title (main); worker search cancelled (spec 04 §5) |
| 9 | game (playing)      | game over detected (spec 03 §3)        | `status = "ended"`, ResultOverlay after flip animation settles |
| 10| game (ended)        | "Rematch"                              | store reset with same config |
| 11| game (ended)        | "Back to Title"                        | `onQuit()` → title (main) |

"Fresh store" and "store reset" are the same operation: `createGameStore(config)` exposes
a `reset()` that rebuilds the initial position (spec 03 §4). Quitting always tears down
any pending AI request so a stale `bestMove` can never land on a new game
(`requestId` guard, spec 04 §4).

## 5. Acceptance criteria

- Every transition in the table is reachable by clicking through the running app.
- Refreshing the page always lands on the title screen (no persistence — by design).
- No game state survives transition 8 or 11 (verified by: quit mid-game, start a new
  game, board shows the opening position and it is black's turn).
- `App.tsx` stays under ~40 lines: signal + `<Switch>` only.
