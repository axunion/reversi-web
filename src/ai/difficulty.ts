import type { Difficulty } from "../logic/types";

// The ceiling stays at 11: levels above it trigger Edax's exact endgame
// solver at a much larger empties count, which can spike search time from
// hundreds of ms to tens of seconds — well past SEARCH_TIMEOUT_MS (see
// aiClient.ts). Level 11 itself can still take a few seconds late midgame
// once its own solve threshold is crossed; that's the cost of genuinely
// strong endgame play on this cold-start-per-move WASM build, not a bug.
const EDAX_LEVELS: Record<Difficulty, number> = {
  easy: 1, // instant, makes visible mistakes — beatable by beginners
  casual: 2, // still shallow, but clearly stronger than easy
  normal: 4, // light midgame awareness, sub-second on phones
  hard: 7, // solid intermediate challenge, punishes loose play
  expert: 11, // strong, exact endgame play; may take a few seconds late midgame
};

export function edaxLevel(d: Difficulty): number {
  return EDAX_LEVELS[d];
}
