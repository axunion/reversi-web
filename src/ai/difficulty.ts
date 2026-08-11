import type { Difficulty } from "../logic/types";

const EDAX_LEVELS: Record<Difficulty, number> = {
  easy: 1, // instant, makes visible mistakes — beatable by beginners
  normal: 5, // club-beginner strength, sub-second on phones
  hard: 11, // strong; may take a few seconds late midgame
};

export function edaxLevel(d: Difficulty): number {
  return EDAX_LEVELS[d];
}
