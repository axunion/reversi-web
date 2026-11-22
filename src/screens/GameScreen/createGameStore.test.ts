import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialBoard, type Progress } from "../../logic/rules";
import {
  createGameStore,
  FLIP_DURATION_MS,
  FLIP_STAGGER_MS,
} from "./createGameStore";

// Re-imports createGameStore with progressAfter stubbed, so a test can force
// a pass or game over without building a board that produces one.
async function importStoreWith(progress: Progress) {
  vi.resetModules();
  vi.doMock("../../logic/rules", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../logic/rules")>()),
    progressAfter: () => progress,
  }));
  return (await import("./createGameStore")).createGameStore;
}

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../../logic/rules");
  vi.resetModules();
});

describe("createGameStore", () => {
  it("updates the board and hands the turn over immediately, unlocking input once the animation completes", () => {
    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore();
      return d;
    });

    store.play(19); // d3

    expect(store.state.board[19]).toBe(1);
    expect(store.state.board[27]).toBe(1); // d4, flipped
    expect(store.state.animating).toBe(true);
    expect(store.state.turn).toBe(2);
    expect(store.legalMoves()).toEqual([]); // input stays locked mid-flip

    vi.runAllTimers();

    expect(store.state.animating).toBe(false);
    expect(store.state.turn).toBe(2);

    dispose();
  });

  it("ignores an illegal move and a move attempted mid-animation", () => {
    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore();
      return d;
    });

    const boardBeforeIllegalMove = store.state.board;
    store.play(0); // corner, no capture on the opening board
    expect(store.state.board).toBe(boardBeforeIllegalMove);
    expect(store.state.turn).toBe(1);

    store.play(19); // legal, starts the flip animation
    expect(store.state.animating).toBe(true);
    const boardDuringAnimation = store.state.board;

    store.play(26); // input is locked mid-animation, so this is a no-op regardless of legality
    expect(store.state.board).toBe(boardDuringAnimation);
    expect(store.state.turn).toBe(2);

    vi.runAllTimers();
    dispose();
  });

  it("sets winner right after the last legal move, with no further input", async () => {
    const createGameStoreWithGameOver = await importStoreWith({
      kind: "gameOver" as const,
      winner: 1 as const,
    });

    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStoreWithGameOver>;
    const dispose = createRoot((d) => {
      store = createGameStoreWithGameOver();
      return d;
    });

    store.play(19); // the last legal move; progressAfter reports gameOver
    expect(store.state.winner).toBeNull(); // the result waits for the flip
    expect(store.state.turn).toBe(1);
    vi.runAllTimers();

    expect(store.state.winner).toBe(1);

    dispose();
  });

  it("keeps the turn with the mover at once on a pass, and shows the pass message only after the flip", async () => {
    const createGameStoreWithPass = await importStoreWith({
      kind: "pass" as const,
      turn: 1 as const,
    });

    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStoreWithPass>;
    const dispose = createRoot((d) => {
      store = createGameStoreWithPass();
      return d;
    });

    store.play(19); // white has no reply, so black moves again
    expect(store.state.turn).toBe(1);
    expect(store.state.passMessage).toBeNull();

    vi.advanceTimersByTime(FLIP_DURATION_MS + FLIP_STAGGER_MS); // flip settles

    expect(store.state.animating).toBe(false);
    expect(store.state.turn).toBe(1);
    expect(store.state.passMessage).toBe(2);

    vi.advanceTimersByTime(1000); // pass message clears after its own timeout
    expect(store.state.passMessage).toBeNull();

    dispose();
  });

  it("reset mid-animation discards the pending settle, so no pass message lands afterwards", async () => {
    const createGameStoreWithPass = await importStoreWith({
      kind: "pass" as const,
      turn: 1 as const,
    });

    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStoreWithPass>;
    const dispose = createRoot((d) => {
      store = createGameStoreWithPass();
      return d;
    });

    store.play(19);
    expect(store.state.animating).toBe(true);

    store.reset(); // mid-flip

    expect(store.state.board).toEqual(initialBoard());
    expect(store.state.turn).toBe(1);
    expect(store.state.animating).toBe(false);
    expect(store.state.lastMove).toBeNull();
    expect(store.legalMoves()).toHaveLength(4); // input is unlocked again

    vi.runAllTimers();

    expect(store.state.board).toEqual(initialBoard());
    expect(store.state.turn).toBe(1);
    expect(store.state.passMessage).toBeNull();

    dispose();
  });

  it("reset restores the opening position and black's turn", () => {
    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore();
      return d;
    });

    store.play(19);
    vi.runAllTimers();
    expect(store.state.turn).toBe(2);

    store.reset();

    expect(store.state.board).toEqual(initialBoard());
    expect(store.state.turn).toBe(1);
    expect(store.state.winner).toBeNull();
    expect(store.state.lastMove).toBeNull();

    dispose();
  });

  it("seeds board/turn/lastMove from a restore payload, leaving everything else at its default", () => {
    const restoreBoard = initialBoard().slice();
    restoreBoard[19] = 1;
    restoreBoard[27] = 1;

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore({ board: restoreBoard, turn: 2, lastMove: 19 });
      return d;
    });

    expect(store.state.board).toEqual(restoreBoard);
    expect(store.state.turn).toBe(2);
    expect(store.state.lastMove).toBe(19);
    expect(store.state.winner).toBeNull();
    expect(store.state.animating).toBe(false);
    expect(store.state.thinking).toBe(false);

    dispose();
  });

  it("reset discards a restore payload and returns to the opening position", () => {
    const restoreBoard = initialBoard().slice();
    restoreBoard[19] = 1;
    restoreBoard[27] = 1;

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore({ board: restoreBoard, turn: 2, lastMove: 19 });
      return d;
    });

    store.reset();

    expect(store.state.board).toEqual(initialBoard());
    expect(store.state.turn).toBe(1);
    expect(store.state.lastMove).toBeNull();

    dispose();
  });
});
