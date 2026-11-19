# Reversi Web

Project-specific rules.

## Verification

Two kinds of checking are kept apart:

- **Structural correctness** (board state, legal moves, flip results, worker protocol
  messages — anything with a right answer): Vitest (`pnpm test`) or Playwright
  (`pnpm test:e2e`). `pnpm check` covers lint/typecheck.
- **Visual and subjective judgment** (flip animation, spacing, felt-green tone, motion
  timing): a live look at `pnpm dev` or the `inspector` agent. Don't automate it with
  exhaustive browsing or screenshot diffing without a real need.

Persist a regression test only for a durable, worth-protecting flow, not a one-off
"verify this change" check. `e2e/smoke.spec.ts` and `e2e/persistence.spec.ts` set the bar; when unsure, ask.

## Subagents

Project agents live in `.claude/agents/`. None writes production code — implementation
stays in the main conversation, and the agents give an opinion from something that
didn't write the code.

| Agent | Role |
| --- | --- |
| `researcher` | External knowledge only: third-party API usage, version fit, deprecations. Never reads this codebase. |
| `reviewer` | Reviews the pending diff against these conventions and for correctness. Read-only. |
| `tester` | Runs `pnpm test` / `pnpm check` / `pnpm test:e2e` and writes missing test cases. Test files only. |
| `inspector` | Renders the app in a disposable browser and inspects it across viewports. |

Scale with risk:

1. **Trivial** (typo, config tweak): implement directly, no agents.
2. **Non-trivial but contained**: implement directly (optionally `Explore` or
   `researcher` first), then run `reviewer` and `tester` in parallel without asking.
3. **Large, ambiguous, or high-risk** (many files, substantial changes to `src/logic/`
   or `src/ai/`): propose `/goal` rather than starting unprompted. Its completion
   condition must explicitly require `reviewer` and `tester` passing, since the
   evaluator doesn't know they exist.

Visual verification is a separate axis, keyed to whether a change touches rendered UI:

- No rendered surface: skip.
- Small, isolated UI tweak: a quick glance at `pnpm dev`.
- Viewport-dependent layout, multi-component styling, or a reported visual bug: run
  `inspector` with full context (it has no memory of the conversation), and treat a fix
  as unverified until a clean re-run.

This gate covers verifying a known change. Agreeing a direction for a UI goal and then
implementing and refining it against the rendered screen is the `ui-refine` skill
(`/ui-refine [goal]`), which drives `inspector` and reads "Product character" below.

## Product character

A client-only Reversi game: 8×8 board, played against a local Edax-WASM AI or a second
player on the same screen. Players are casual and mobile-first: playable one-handed at
360×640, no horizontal scroll at ≥320px. The look is a deep felt-green board in a dark
wood frame on a near-black green page with a gold accent, and a 500ms disc flip with a
pop ease, disabled under `prefers-reduced-motion`. Menus stay sparse, with few controls
(Restart was dropped on purpose).
