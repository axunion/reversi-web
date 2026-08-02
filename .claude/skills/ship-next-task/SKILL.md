---
name: ship-next-task
description: Picks the next unchecked task from spec/PROGRESS.md and runs it through research, implementation, testing, and review, then commits it and checks it off. One task per invocation — intended to be driven repeatedly (e.g. via /loop) until spec/PROGRESS.md is fully checked off.
disable-model-invocation: true
---

# Ship Next Task

Drives exactly one `spec/PROGRESS.md` task from research to a committed change. Designed to be invoked repeatedly — directly, or via `/loop ship-next-task` in dynamic mode — until every task is checked off.

## Auto-commit authorization

This skill commits on the user's behalf without asking each time. This is an explicit, standing exception to Claude Code's default "never commit without being asked" behavior, authorized in advance by the user for this project when this skill was set up. Every commit this skill makes must still follow CLAUDE.md's commit message format and safety rules (no `--no-verify`, no secrets, a new commit rather than `--amend`).

## Procedure

Every subagent call below runs in the **foreground** (`run_in_background: false`).
Do not proceed to the next step until the previous subagent has actually returned —
this procedure is strictly sequential, each step needs the previous step's output.

1. Read `spec/PROGRESS.md`. If every task is checked, report that the plan is fully
   implemented and, if this run was reached via `/loop`, call `ScheduleWakeup` with
   `stop: true` instead of scheduling another wakeup. Otherwise just stop.
2. Pick the first unchecked task, top to bottom. If it is marked `**[MANUAL]**`,
   do not attempt it — report which manual task is next and why (see
   `spec/PROGRESS.md`'s note on manual gates), and stop the same way as step 1.
3. Run the `spec-researcher` subagent on that task to get an implementation brief.
4. Run the `milestone-implementer` subagent with that brief.
5. Run the `test-runner` subagent against the result.
   - If it reports failures, send them back to `milestone-implementer` to fix, then
     re-run `test-runner`. Retry at most twice; if still failing, stop and report the
     blocker instead of committing broken code.
6. Run the `code-reviewer` subagent. Its report labels each finding `CONFIRMED` or
   `PLAUSIBLE` in its text regardless of how the finding is transported.
   - Apply fixes for every `CONFIRMED` finding via `milestone-implementer`, then
     re-run `test-runner` if the fix touched production code, then re-run
     `code-reviewer` once more to confirm the fix didn't introduce a new issue.
     Allow at most one such fix-and-re-review cycle; if `code-reviewer` still has
     `CONFIRMED` findings after that, stop and report them instead of looping.
   - Leave `PLAUSIBLE` findings unresolved; note them in step 8 instead of
     auto-resolving or silently dropping them.
7. Run `pnpm check && pnpm test` yourself as the final gate before committing.
8. Check off the task in `spec/PROGRESS.md` (add an inline comment next to it noting
   any unresolved `PLAUSIBLE` findings), then stage the task's files together with
   this `spec/PROGRESS.md` change and make **one** commit, following CLAUDE.md's
   commit message format (imperative summary ≤70 chars, motivation only if not
   evident, bullets only for 2+ distinct changes). Never `--amend` — CLAUDE.md
   forbids it unless the user explicitly asks.
9. Report what was shipped in one or two sentences.

## Scope discipline

Each invocation ships exactly one `spec/PROGRESS.md` line item. If a task turns out to be too large for one clean commit once the brief comes back, split it into sub-items in `spec/PROGRESS.md` first — don't half-implement it — and ship only the first sub-item this run.
