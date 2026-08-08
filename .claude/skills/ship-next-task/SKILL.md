---
name: ship-next-task
description: Picks the next unchecked task from spec/PROGRESS.md, implements it here, verifies it with the reviewer and tester agents, then commits it and checks it off. One task per invocation — intended to be driven repeatedly (e.g. via /loop) until spec/PROGRESS.md is fully checked off.
disable-model-invocation: true
---

# Ship Next Task

Drives exactly one `spec/PROGRESS.md` task from research to a committed change. Designed
to be invoked repeatedly — directly, or via `/loop ship-next-task` in dynamic mode —
until every task is checked off.

This is `feature-loop` specialized to the spec backlog: same research → implement →
review + test shape, but the task comes from `spec/PROGRESS.md` instead of an argument,
and it ends in a commit. Use `feature-loop` for work that isn't a backlog line item.

**You implement the task yourself, in this conversation.** No agent writes code here.
The research, review, and test agents are read-only or test-only; handing implementation
to an agent would restart every fix pass from a summary instead of from the code you
actually wrote.

## Auto-commit authorization

This skill commits on the user's behalf without asking each time. This is an explicit,
standing exception to Claude Code's default "never commit without being asked" behavior,
authorized in advance by the user for this project when this skill was set up. Every
commit this skill makes must still follow CLAUDE.md's commit message format and safety
rules (no `--no-verify`, no secrets, a new commit rather than `--amend`).

## Procedure

Every `Agent` call below runs in the **foreground** (`run_in_background: false`).
Subagents run in the background by default, which returns a name instead of a result and
breaks the sequencing. Each agent starts fresh with no memory of this conversation, so
restate the task in full on every call.

1. Read `spec/PROGRESS.md`. If every task is checked, report that the plan is fully
   implemented and, if this run was reached via `/loop`, call `ScheduleWakeup` with
   `stop: true` instead of scheduling another wakeup. Otherwise just stop.
2. Pick the first unchecked task, top to bottom. If it is marked `**[MANUAL]**`,
   do not attempt it — report which manual task is next and why (see
   `spec/PROGRESS.md`'s note on manual gates), and stop the same way as step 1.
3. **Research — two agents in parallel**, in the same message:
   - the built-in **`Explore`** agent, at **very thorough** breadth: which spec sections
     cover this task, the current state of the relevant files under `src/` (they may not
     exist yet, or may partially exist from a prior task — don't assume), and the
     test-file conventions to mirror. Explore does not load `CLAUDE.md`, so restate the
     rules it must respect: `src/logic/` and `src/ai/protocol.ts`/`difficulty.ts` never
     import Solid, `public/edax/` is never hand-edited.
   - the **`researcher`** agent, when the task leans on a library API worth confirming
     (Kobalte, Solid stores, Vitest, Web Worker/Emscripten loading). Skip it for a task
     that's pure TypeScript with no external API surface.

   If either reports a genuine ambiguity in the spec, stop and report it rather than
   guessing — a wrong guess here gets committed.
4. **Implement the task yourself**, scoped to exactly that one `spec/PROGRESS.md` line
   item. Follow `CLAUDE.md` and the specific `spec/*.md` section the task maps to:
   quote-level fidelity to the spec's acceptance criteria, simplest thing that works,
   surgical changes, one concern per file, English-only strings and comments. Write or
   extend tests alongside the implementation whenever the task's spec section defines a
   test list. Do not touch files outside the task's scope.
5. Run the **`tester`** agent. If it reports failures, fix them yourself and re-run
   `tester`. Retry at most twice; if it still fails, stop and report the blocker instead
   of committing broken code.
6. Run the **`reviewer`** agent. Its findings are labelled `CONFIRMED` or `PLAUSIBLE`.
   - Fix every `CONFIRMED` finding yourself, re-run `tester` if the fix touched
     production code, then re-run `reviewer` once more to confirm the fix didn't
     introduce a new issue. Allow at most one such fix-and-re-review cycle; if
     `reviewer` still has `CONFIRMED` findings after that, stop and report them instead
     of looping.
   - Leave `PLAUSIBLE` findings unresolved; note them in step 8 instead of
     auto-resolving or silently dropping them.
7. Run `pnpm check && pnpm test` yourself as the final gate before committing.
8. Check off the task in `spec/PROGRESS.md` (add an inline comment next to it noting
   any unresolved `PLAUSIBLE` findings), then stage the task's files together with
   this `spec/PROGRESS.md` change and make **one** commit, following CLAUDE.md's
   commit message format (imperative summary ≤70 chars, motivation only if not
   evident, bullets only for 2+ distinct changes). Never `--amend` — CLAUDE.md
   forbids it unless the user explicitly asks.
9. Report what was shipped in one or two sentences. If the task changed rendered UI,
   say so and note that `inspector` has not been run — visual verification is a
   separate, deliberate step outside this loop (see CLAUDE.md's "Subagents" section),
   not something to fold in automatically.

## Scope discipline

Each invocation ships exactly one `spec/PROGRESS.md` line item. If a task turns out to
be too large for one clean commit once research comes back, split it into sub-items in
`spec/PROGRESS.md` first — don't half-implement it — and ship only the first sub-item
this run.
