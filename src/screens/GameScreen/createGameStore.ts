import { createMemo, onCleanup } from "solid-js";
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
import type { Board, GameConfig, Player } from "../../logic/types";

// Mirrors the --flip-duration / --flip-stagger CSS custom properties (src/index.css)
// so the timing numbers exist in exactly one place.
export const FLIP_DURATION_MS = 500;
export const FLIP_STAGGER_MS = 60;

const PASS_MESSAGE_MS = 1000;

type GameState = {
  board: Board;
  turn: Player;
  status: "playing" | "ended";
  winner: Player | "draw" | null;
  lastMove: number | null;
  flipDelays: Record<number, number>;
  passMessage: Player | null;
  thinking: boolean;
  animating: boolean;
};

function chebyshevDistance(a: number, b: number): number {
  const rowA = Math.floor(a / SIZE);
  const colA = a % SIZE;
  const rowB = Math.floor(b / SIZE);
  const colB = b % SIZE;
  return Math.max(Math.abs(rowA - rowB), Math.abs(colA - colB));
}

function initialState(): GameState {
  return {
    board: initialBoard(),
    turn: 1,
    status: "playing",
    winner: null,
    lastMove: null,
    flipDelays: {},
    passMessage: null,
    thinking: false,
    animating: false,
  };
}

// config is unused today (the store is identical for PvP and AI games; whose
// turn triggers the AI is GameScreen's job per spec 04 §5) but is part of the
// spec's public signature, so it's kept for that future wiring.
export function createGameStore(_config: GameConfig) {
  const [state, setState] = createStore<GameState>(initialState());

  let animationTimeout: ReturnType<typeof setTimeout> | undefined;
  let passTimeout: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    clearTimeout(animationTimeout);
    clearTimeout(passTimeout);
  });

  const legalMoves = createMemo(() =>
    state.status === "playing" ? getLegalMoves(state.board, state.turn) : [],
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

    setState("status", "ended");
    setState("winner", progress.winner);
  }

  function play(index: number) {
    if (state.status !== "playing" || state.animating) return;
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

    setState("board", board);
    setState("lastMove", index);
    setState("flipDelays", flipDelays);
    setState("animating", true);

    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
      setState("animating", false);
      finishMove(mover, board);
    }, maxDelay + FLIP_DURATION_MS);
  }

  function reset() {
    clearTimeout(animationTimeout);
    clearTimeout(passTimeout);
    setState(initialState());
  }

  return { state, legalMoves, score, play, reset };
}
