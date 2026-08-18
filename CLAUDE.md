# Global Claude Rules

Behavioral defaults plus house conventions. Bias toward caution over speed; on trivial
tasks, use judgment.

## Approach

- **Think before coding.** State assumptions. Make routine judgment calls yourself and
  note them; ask only when different interpretations would lead to materially different
  work. If a simpler path exists, say so and push back when warranted.
- **Simplest thing that works.** Write the minimum code that solves the stated problem —
  nothing speculative. No unasked-for abstractions, flexibility, or error handling for
  impossible cases. If 200 lines could be 50, rewrite it.
- **Surgical changes.** Every changed line should trace to the request. Don't refactor,
  reformat, or "improve" adjacent code that isn't broken; match the surrounding style.
  Remove only the imports and symbols your change orphaned; leave unrelated dead code alone
  and mention it.
- **Goal-driven.** Turn each task into a verifiable outcome ("fix the bug" → "write a
  failing test that reproduces it, then make it pass"). For multi-step work, state a brief
  plan before starting.

## Language

Write everything in **English** — in-code comments, console output, error and log
messages, AI-readable instruction files, and docs meant for readers (README and the
like). This rule applies to artifacts, not conversation: chat replies and
development-time planning notes follow the language the user is working in.

## Code Structure

- Name variables, functions, and files to communicate intent.
- One concern per file; split new code when a file exceeds ~300 lines. Don't split
  existing files unless asked.
- Extract a helper only when used in 3+ places; otherwise inline it.
- Delete dead code you create; never comment it out.

## Testing

- Write tests before or alongside implementation — they are your success criteria.
- Test observable outcomes and edge cases, not implementation details.
- Each test is fully self-contained; no shared mutable state between tests.

Two kinds of checking are deliberately kept apart:

- **Structural correctness** — board state, legal moves, flip results, worker protocol
  messages: anything with a right answer. This belongs in Vitest (`pnpm test`) or the
  Playwright suite (`pnpm test:e2e`) and runs automatically as part of verification.
- **Visual and subjective judgment** — "does the flip look right", spacing, felt-green
  tone, motion timing. No script judges this reliably, and forcing it (exhaustive
  automated browsing, screenshot diffing without a real need) is slow and still misses
  what a person catches at a glance. This stays a live check — a look at `pnpm dev`, or
  the `inspector` agent. Don't try to automate it away.

Persist a regression test only for a durable, worth-protecting flow, not for a one-off
"let me verify this change" check. `e2e/smoke.spec.ts` sets the bar. The same rule that
governs abstractions governs test files: a check that did its job once doesn't need to
become permanent. When unsure whether something is worth keeping, ask.

## Subagents

Four project agents live in `.claude/agents/`, alongside Claude Code's built-in ones
(notably `Explore`, which covers local file discovery — nothing here duplicates it):

| Agent | Role |
| --- | --- |
| `researcher` | External knowledge only: third-party API usage, version fit, deprecations. Never reads this codebase for conventions. |
| `reviewer` | Reviews the pending diff against these conventions and general correctness. Read-only. |
| `tester` | Runs `pnpm test` / `pnpm check` / `pnpm test:e2e`, and writes missing test cases. Test files only. |
| `inspector` | Renders the app in a disposable browser and inspects the result across viewports. |

None writes production code — implementation always stays in the main conversation. A
write agent would need nearly every tool anyway, and its real product would be the
working tree rather than a summary; what the read-only agents give instead is an
opinion from something that didn't write the code.

Scaffolding scales with risk:

1. **Trivial** (typo, config tweak): implement directly, no agents.
2. **Non-trivial but contained**: implement directly, optionally researching first
   (`Explore` or `researcher`), then run `reviewer` and `tester` in parallel **without
   asking first** — low cost, since both are read-only/test-only.
3. **Large, ambiguous, or high-risk** (spans many files, substantially touches
   `src/logic/` or `src/ai/`, or genuinely ambiguous): propose the built-in `/goal`
   command rather than starting unprompted — cost and duration, not risk, is why this
   needs asking. Give it a completion condition that explicitly requires `reviewer` and
   `tester` passing (`/goal`'s evaluator doesn't otherwise know they exist, and the loop
   would end right after implementation). Per turn: research (`Explore` + `researcher`
   in parallel), implement, then `reviewer` + `tester` in parallel, until the evaluator
   confirms.

**Visual verification is a separate axis, not a fourth tier** — keyed to whether a
change touches rendered UI, not to how risky it is.

- No rendered surface: skip.
- Small, isolated UI tweak: a quick glance at `pnpm dev` is enough.
- Viewport-dependent layout, multi-component styling, or a reported visual bug: run
  `inspector` — it has no memory of the conversation, so give it full context, and treat
  a fix as unverified until a clean re-run.

Needs no confirmation to run, but isn't automatic either — weigh it against the cases
above each time.

## Commits

Format — plain prose, no prefixes or labels (`feat:`, `fix:`, and the like):

```
<summary: imperative mood, ≤70 chars, no trailing period>

<motivation: one sentence, only when not evident from the diff>

- <change bullets: only for 2+ distinct changes>
```

- Never commit secrets (`*.key`, `*.pem`, `credentials*`).
- Never use `--no-verify`. Use `--amend` only when explicitly asked; default to a new
  commit.
