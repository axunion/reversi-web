import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialBoard } from "../../logic/rules";
import { createGameStore } from "./createGameStore";

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../../logic/rules");
  vi.resetModules();
});

describe("createGameStore", () => {
  it("updates the board immediately and hands the turn over once the animation completes", () => {
    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore({ mode: "pvp" });
      return d;
    });

    store.play(19); // d3

    expect(store.state.board[19]).toBe(1);
    expect(store.state.board[27]).toBe(1); // d4, flipped
    expect(store.state.animating).toBe(true);
    expect(store.state.turn).toBe(1); // not handed over yet

    vi.runAllTimers();

    expect(store.state.animating).toBe(false);
    expect(store.state.turn).toBe(2);

    dispose();
  });

  it("ignores an illegal move and a move attempted mid-animation", () => {
    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore({ mode: "pvp" });
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
    expect(store.state.turn).toBe(1);

    vi.runAllTimers();
    dispose();
  });

  it("reaches status 'ended' right after the last legal move, with no further input", async () => {
    vi.resetModules();
    vi.doMock("../../logic/rules", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../logic/rules")>();
      return {
        ...actual,
        progressAfter: () => ({
          kind: "gameOver" as const,
          winner: 1 as const,
        }),
      };
    });

    const { createGameStore: createGameStoreWithGameOver } = await import(
      "./createGameStore"
    );

    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStoreWithGameOver>;
    const dispose = createRoot((d) => {
      store = createGameStoreWithGameOver({ mode: "pvp" });
      return d;
    });

    store.play(19); // the last legal move; progressAfter reports gameOver
    vi.runAllTimers();

    expect(store.state.status).toBe("ended");
    expect(store.state.winner).toBe(1);

    dispose();
  });

  it("reset restores the opening position and black's turn", () => {
    vi.useFakeTimers();

    let store!: ReturnType<typeof createGameStore>;
    const dispose = createRoot((d) => {
      store = createGameStore({ mode: "pvp" });
      return d;
    });

    store.play(19);
    vi.runAllTimers();
    expect(store.state.turn).toBe(2);

    store.reset();

    expect(store.state.board).toEqual(initialBoard());
    expect(store.state.turn).toBe(1);
    expect(store.state.status).toBe("playing");
    expect(store.state.lastMove).toBeNull();

    dispose();
  });
});
