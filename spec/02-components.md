# 02 — Components & CSS Modules

Component breakdown and the CSS design that delivers the "commercial console game" look
with zero image assets. Every component has exactly one co-located `.module.css`.

## 1. Component tree

```
App
├─ TitleScreen                        (screen)
└─ GameScreen                         (screen; owns game store + AI client)
   ├─ TurnIndicator                   (turn, score, AI-thinking state)
   ├─ Board
   │   └─ 64 × cell button
   │       └─ Disc (when occupied)
   ├─ InGameMenu                      (modal, conditional)
   └─ ResultOverlay                   (modal, conditional on status === "ended")
```

Props are plain and shallow; no context providers. The store object from
`createGameStore` is created in `GameScreen` and passed down as props (Solid stores stay
reactive through props).

| Component     | Props (essence)                                                        |
| ------------- | ---------------------------------------------------------------------- |
| TitleScreen   | `onStart(config: GameConfig)`, `aiAvailable: boolean`                  |
| GameScreen    | `config: GameConfig`, `onQuit()`                                       |
| TurnIndicator | `turn`, `score: {black, white}`, `thinking: boolean`, `passMessage`    |
| Board         | `board`, `legalMoves`, `lastMove`, `flipDelays`, `disabled`, `onCellClick(i)` |
| Disc          | `player: Player`, `flipDelayMs: number`                                |
| InGameMenu    | `open`, `onResume()`, `onRestart()`, `onQuitToTitle()`                 |
| ResultOverlay | `score`, `winner: Player \| "draw"`, `config`, `onRematch()`, `onQuitToTitle()` |

Cells are rendered inline inside `Board.tsx` (a `<button>` per index via `<Index>`); a
separate `Cell` component is not needed — the only stateful visual inside a cell is
`Disc`.

## 2. Design tokens (`src/index.css`)

Global file contains only: a minimal reset, `:root` tokens, and body background — see
`src/index.css` for the current token values.

Page background is a subtle `radial-gradient(var(--bg) → black)` vignette so the board
appears lit from above.

## 3. Board visuals (`Board.module.css`)

- `.board`: CSS grid `repeat(8, 1fr)`, `aspect-ratio: 1 / 1`,
  `width: min(92vmin, 560px)`, centered. Background `var(--felt)` with a faint
  `radial-gradient` darkening toward the edges; grid lines via `gap: 2px` over a
  `var(--grid-line)` background. Wrapped in `.frame` (padding + `var(--frame)` background,
  `border-radius: var(--radius)`, outer `box-shadow` for depth).
- **Star points**: 4 dots at the grid intersections around cells (2,2), (2,6), (6,2),
  (6,6) — implemented as absolutely positioned `.star` divs on the board (positions in %:
  `calc(2 / 8 * 100%)` etc.), `width: 3.5%`, round, `var(--grid-line)`. Positioned on the
  board, not on cells, so they sit exactly on line crossings.
- `.cell`: an unstyled `<button>`, `perspective: 240px` (gives each disc its own 3D
  space), inner `radial-gradient` sheen at the top-left for a felt-fiber feel. Focus
  visible ring for keyboard play.
- **Legal-move hint** `.hint`: small translucent dot (`::after`) centered in the cell,
  `opacity .45`, in the current player's color; shown only on cells listed in
  `legalMoves` and only when input is enabled.
- **Last move marker** `.lastMove`: tiny accent-colored dot rendered above the disc.

## 4. Disc and the 3D flip (`Disc.module.css`)

A disc is one element with two absolutely stacked faces; color changes are expressed
*only* by rotating the parent, so every color change animates for free — see `Disc.tsx`
/ `Disc.module.css` for the current implementation.

- **Gloss**: the off-center `radial-gradient` highlight reads as curved plastic; no
  images anywhere.
- **Stagger**: `flipDelayMs` comes from the store's `flipDelays` map
  (spec 03 §4): the placed disc appears immediately (pop-in animation
  `scale(.5)→1` via a one-shot `@keyframes`), each flipped disc gets
  `chebyshevDistance(from placed cell) * var(--flip-stagger)`. The wave of flips
  radiating from the placed stone is the signature motion of the game.
- **Reduced motion**: under `@media (prefers-reduced-motion: reduce)`, `transition` and
  the pop-in animation are disabled (instant color change).

## 5. TitleScreen (`TitleScreen.module.css`)

- Full-viewport flex column, centered; logo is styled text (letter-spaced, gold
  `var(--accent)`, soft `text-shadow` glow) over the vignette background. A slow CSS
  `@keyframes` shimmer on the logo gives it life without being busy.
- Menu entries are large tappable buttons (min-height 48px), ghost style (transparent,
  1px gold border) with a filled hover/focus state.
- Difficulty and color pickers are segmented controls built on Kobalte's
  `RadioGroup`/`RadioGroup.Item` (headless — `RadioGroup.ItemControl` +
  `RadioGroup.ItemLabel` get the full custom look via CSS Modules, but keyboard
  navigation, roving tabindex, and `aria-checked` come from the primitive instead of
  being reimplemented).

## 6. In-game chrome: minimal by design

- The only persistent chrome during play is `TurnIndicator` (one slim row above the
  board: two disc glyphs with live counts, the active side subtly glowing; shows
  "Thinking…" with a small CSS pulse during AI search, and flashes "Pass" for 1s when a
  pass occurs) and a single **menu button** — a small ghost button pinned to a corner
  showing lucide-solid's `Menu` icon, `opacity: .5` until hover/focus.
- `InGameMenu` and `ResultOverlay` are both built on Kobalte's `Dialog` primitive
  (`Dialog.Portal` / `Dialog.Overlay` / `Dialog.Content`), styled with CSS Modules to
  the same recipe: fixed full-viewport `var(--overlay)` backdrop with `backdrop-filter:
  blur(4px)`, centered panel (`var(--frame)` background, radius, shadow), fade+scale-in
  ~180ms. Buttons stacked vertically, same style as the title menu. Using `Dialog` means
  focus trap, `Escape`-to-close, and `aria-modal`/labelling come from the primitive —
  nothing to hand-roll here. **`ResultOverlay` opts out of Kobalte's default dismiss
  behavior** (`onEscapeKeyDown`/`onPointerDownOutside`/`onInteractOutside` all
  `preventDefault()`): the game just ended and the board is no longer interactive, so
  dismissing the overlay without choosing Rematch/Back to Title would strand the player
  on a dead board. `InGameMenu` keeps the default dismiss behavior (`Escape` = Resume).
- `ResultOverlay` content: headline is color-based in PvP ("Black wins / White wins /
  Draw") but personalized in AI mode using `config.playerColor` ("You win! / Computer
  wins / Draw") — this is why `ResultOverlay` takes `config` as a prop. Final score as
  two disc glyphs with counts, then Rematch / Back to Title.

## 7. Responsive rules

- Mobile-first: the board sizes with `min(92vmin, 560px)` so it fits any portrait phone
  with the indicator row; on desktop it stays centered with generous dark margins —
  content never stretches.
- All interactive targets ≥ 44px on touch. No hover-only affordances (hints are always
  visible on legal cells).
- No horizontal scrolling at any viewport ≥ 320px wide.

## 8. Visual checklist (M5 exit criteria)

- [x] Discs show a convincing off-center gloss and cast a visible soft shadow.
- [x] Placing a stone pops it in; captured discs flip in a radiating staggered wave.
- [x] The flip is visibly 3D (edge-on midpoint), not a crossfade.
- [x] Star points sit exactly on the four line crossings.
- [x] Title → game → result → title runs with no layout shift and no scrollbars.
- [x] `prefers-reduced-motion` disables flips/pop-ins but the game stays fully playable.
- [x] Board is playable one-handed on a 360×640 viewport; desktop view is centered and
      never stretched.
