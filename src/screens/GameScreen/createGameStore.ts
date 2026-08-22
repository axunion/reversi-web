import { batch, createMemo, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import {
  applyMove,
  countDiscs,
  getLegalMoves,
  initialBoard,
  opponent,
  progressAfter,
  SIZE,
} from "../../logic/rules";
import type { Board, Outcome, Player } from "../../logic/types";

// Mirrors the --flip-duration / --flip-stagger CSS custom properties (src/index.css)
// so the timing numbers exist in exactly one place.
export const FLIP_DURATION_MS = 500;
export const FLIP_STAGGER_MS = 60;

const PASS_MESSAGE_MS = 1000;

type GameState = {
  board: Board;
  turn: Player;
  winner: Outcome | null;
  lastMove: number | null;
  flipDelays: Record<number, number>;
  passMessage: Player | null;
  thinking: boolean;
  animating: boolean;
  // Bumped on every reset(). Lets a consumer detect "the game was reset" even
  // in the one case where every other field happens to end up unchanged: a
  // Restart during the AI's very first search of a game (turn/animating/
  // winner all already hold their initial values, so nothing else here would
  // otherwise flag the reset).
  generation: number;
};

function chebyshevDistance(a: number, b: number): number {
  const rowA = Math.floor(a / SIZE);
  const colA = a % SIZE;
  const rowB = Math.floor(b / SIZE);
  const colB = b % SIZE;
  return Math.max(Math.abs(rowA - rowB), Math.abs(colA - colB));
}

function initialState(generation: number): GameState {
  return {
    board: initialBoard(),
    turn: 1,
    winner: null,
    lastMove: null,
    flipDelays: {},
    passMessage: null,
    thinking: false,
    animating: false,
    generation,
  };
}

export function createGameStore() {
  const [state, setState] = createStore<GameState>(initialState(0));

  let animationTimeout: ReturnType<typeof setTimeout> | undefined;
  let passTimeout: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    clearTimeout(animationTimeout);
    clearTimeout(passTimeout);
  });

  // !animating skips a recompute against the pre-flip board/mover pair that a
  // move-in-progress leaves stale for its duration; callers must not read the
  // resulting [] as "no legal moves" (i.e. a pass) during that window.
  const legalMoves = createMemo(() =>
    state.winner === null && !state.animating
      ? getLegalMoves(state.board, state.turn)
      : [],
  );

  const score = createMemo(() => countDiscs(state.board));

  function finishMove(mover: Player, board: Board) {
    const progress = progressAfter(board, mover);

    if (progress.kind === "play") {
      setState("turn", progress.turn);
      return;
    }

    if (progress.kind === "pass") {
      setState("turn", progress.turn);
      setState("passMessage", opponent(mover));
      clearTimeout(passTimeout);
      passTimeout = setTimeout(
        () => setState("passMessage", null),
        PASS_MESSAGE_MS,
      );
      return;
    }

    setState("winner", progress.winner);
  }

  function play(index: number) {
    if (state.winner !== null || state.animating) return;
    if (!legalMoves().includes(index)) return;

    const mover = state.turn;
    const { board, flips } = applyMove(state.board, mover, index);

    const flipDelays: Record<number, number> = { [index]: 0 };
    let maxDelay = 0;
    for (const flip of flips) {
      const delay = chebyshevDistance(index, flip) * FLIP_STAGGER_MS;
      flipDelays[flip] = delay;
      if (delay > maxDelay) maxDelay = delay;
    }

    // batch(): play() can be invoked from outside a Solid-tracked context (the
    // AI orchestration effect calls it after an await, not from a DOM event),
    // where Solid doesn't auto-batch consecutive setState calls. Without this,
    // an effect that reads more than one of these fields can observe a torn
    // intermediate state - e.g. animating already false but turn not yet
    // updated - and react to it as if it were a real, settled state.
    batch(() => {
      setState("board", board);
      setState("lastMove", index);
      setState("flipDelays", flipDelays);
      setState("animating", true);
    });

    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
      batch(() => {
        setState("animating", false);
        finishMove(mover, board);
      });
    }, maxDelay + FLIP_DURATION_MS);
  }

  function reset() {
    clearTimeout(animationTimeout);
    clearTimeout(passTimeout);
    setState(initialState(state.generation + 1));
  }

  function setThinking(thinking: boolean) {
    setState("thinking", thinking);
  }

  return { state, legalMoves, score, play, reset, setThinking };
}
