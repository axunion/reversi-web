---
name: ui-refine
description: Agrees a short direction brief with the user for a UI goal, then implements and refines it on its own against the rendered UI (checked by the `inspector` agent in Playwright) until the brief's done-conditions hold. Explicit invocation only — use when the user invokes /ui-refine.
disable-model-invocation: true
argument-hint: "[goal — a screen, a feature, or what to improve]"
---

# UI refine

Agree a short direction, then implement and refine against the rendered UI on your own.
You write every change in this conversation; `inspector` only looks. Nothing is kept
between runs.

## 1. Orient

If no goal was given, first ask what to improve with AskUserQuestion: a screen or
feature, a quality such as consistency or responsiveness, or "survey everything and
propose". Survey the whole UI only on that last answer.

Read the "Product character" section of `CLAUDE.md` and the code in scope. If the
section is missing, infer the character from the README and the existing styles and say
so in the brief. If the change can't be judged by looking at the screen (data, auth,
contracts across screens), say so and propose explore → plan → implement → commit
instead of continuing; don't run `inspector`. Otherwise run `inspector` in explore mode
on the screens the goal touches, at the viewports and themes that matter, to see the
current state; skip this when nothing renders yet. Its brief names those screens, the
source of truth for expected behavior (the character section, README, or spec), and the
findings already seen. If Playwright or its browser can't launch, say so and stop.
Beyond that, ask nothing yet.

## 2. Direction — the conversation phase

Present a short brief, about ten lines:

- **Goal** — what should be better or exist afterwards.
- **Direction** — the approach; 2–3 options with a recommendation when taste decides it.
- **Constraints** — what not to touch, what must stay consistent.
- **Done** — conditions anyone can check on the rendered UI.
- **Round limit** — default 5.

Ask with AskUserQuestion only where the answer changes the work materially. Revise until
the user approves; the approved brief is the contract for the rest of the run.

## 3. Iterate — autonomous after approval

Each round:

1. Make the smallest next step toward Done.
2. Run the project's typecheck, lint, and tests, using the commands `CLAUDE.md` gives.
3. Brief `inspector` in verify mode. It has no memory of this conversation, so give it
   the brief, what changed, and the viewports and states to check.
4. Compare what it reports with Done and Direction, then fix. A `spec-gap` finding is a
   question it can't ask itself: settle it within the brief, or list it in the report.

Stop when Done holds, the round limit is reached, a round makes no progress, or a
regression keeps coming back. Stop and ask if a decision would change Direction or
Constraints; for anything smaller, take the smaller change and list it in the report.

## 4. Report

Each Done condition, met or not, in one line; what changed; the decisions you took on
your own; what is left, including any regression test `inspector` flagged as worth
keeping (don't write it). Don't commit on your own; when the user asks, follow the
project's `CLAUDE.md` for commits.
