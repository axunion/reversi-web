import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSavedGame, loadGame, saveGame } from "./gamePersistence";
import { initialBoard } from "./logic/rules";

beforeEach(() => {
  localStorage.clear();
});

describe("gamePersistence", () => {
  it("round-trips a pvp game", () => {
    saveGame({
      config: { mode: "pvp" },
      board: initialBoard(),
      turn: 2,
      lastMove: 19,
    });

    expect(loadGame()).toEqual({
      config: { mode: "pvp" },
      board: initialBoard(),
      turn: 2,
      lastMove: 19,
    });
  });

  it("round-trips an ai game", () => {
    saveGame({
      config: { mode: "ai", difficulty: "hard", playerColor: 2 },
      board: initialBoard(),
      turn: 1,
      lastMove: null,
    });

    expect(loadGame()).toEqual({
      config: { mode: "ai", difficulty: "hard", playerColor: 2 },
      board: initialBoard(),
      turn: 1,
      lastMove: null,
    });
  });

  it("returns null when nothing is stored", () => {
    expect(loadGame()).toBeNull();
  });

  it("clearSavedGame removes the entry", () => {
    saveGame({
      config: { mode: "pvp" },
      board: initialBoard(),
      turn: 1,
      lastMove: null,
    });

    clearSavedGame();

    expect(loadGame()).toBeNull();
  });

  it("returns null for invalid JSON instead of throwing", () => {
    localStorage.setItem("reversi:save", "{not json");

    expect(loadGame()).toBeNull();
  });

  it("returns null for a board with the wrong length", () => {
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "pvp" },
        board: initialBoard().slice(0, 63),
        turn: 1,
        lastMove: null,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  it("returns null for a board with an out-of-range cell value", () => {
    const badBoard = initialBoard().slice();
    (badBoard as number[])[0] = 3;
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "pvp" },
        board: badBoard,
        turn: 1,
        lastMove: null,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  it("returns null for an invalid turn", () => {
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "pvp" },
        board: initialBoard(),
        turn: 3,
        lastMove: null,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  it("returns null for an out-of-range lastMove", () => {
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "pvp" },
        board: initialBoard(),
        turn: 1,
        lastMove: 64,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  it("returns null for an unrecognized config.mode", () => {
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "bogus" },
        board: initialBoard(),
        turn: 1,
        lastMove: null,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  it("returns null for an ai config with an unknown difficulty", () => {
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "ai", difficulty: "impossible", playerColor: 1 },
        board: initialBoard(),
        turn: 1,
        lastMove: null,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  it("returns null for an ai config with an invalid playerColor", () => {
    localStorage.setItem(
      "reversi:save",
      JSON.stringify({
        config: { mode: "ai", difficulty: "hard", playerColor: 3 },
        board: initialBoard(),
        turn: 1,
        lastMove: null,
      }),
    );

    expect(loadGame()).toBeNull();
  });

  describe("when localStorage throws", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("saveGame swallows a setItem failure (e.g. quota exceeded) instead of throwing", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() =>
        saveGame({
          config: { mode: "pvp" },
          board: initialBoard(),
          turn: 1,
          lastMove: null,
        }),
      ).not.toThrow();
    });

    it("loadGame returns null instead of throwing when getItem fails", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expect(loadGame()).toBeNull();
    });

    it("clearSavedGame swallows a removeItem failure instead of throwing", () => {
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expect(() => clearSavedGame()).not.toThrow();
    });
  });
});
