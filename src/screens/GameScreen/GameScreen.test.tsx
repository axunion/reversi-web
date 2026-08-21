import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MainToWorker, WorkerToMain } from "../../ai/protocol";
import boardStyles from "../../components/Board/Board.module.css";
import turnIndicatorStyles from "../../components/TurnIndicator/TurnIndicator.module.css";
import GameScreen from "./GameScreen";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.doUnmock("../../logic/rules");
  vi.resetModules();
});

describe("GameScreen", () => {
  it("plays a move through the real DOM: board updates immediately, input locks during the flip animation, and the turn indicator hands over once it settles", () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />
    ));

    const sides = () =>
      container.querySelectorAll(`.${turnIndicatorStyles.side}`);
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    );

    fireEvent.click(buttons()[19]); // d3, a legal opening move

    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
    expect(buttons()[27].querySelector('[class*="disc"]')).not.toBeNull(); // d4, flipped
    expect(buttons()[19].classList.contains(boardStyles.lastMove)).toBe(true);
    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(true); // locked mid-animation
    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    ); // not handed over yet

    vi.runAllTimers();

    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(false);
    expect(sides()[1].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    );
    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      false,
    );
  });

  it("opens InGameMenu from the menu button, and Resume closes it again", () => {
    render(() => <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />);

    expect(screen.queryByText("Menu")).toBeNull();

    fireEvent.click(screen.getByLabelText("Menu"));
    const dialog = screen.getByRole("dialog");
    expect(screen.getByText("Menu")).not.toBeNull();
    expect(dialog.hasAttribute("data-closed")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    // Kobalte keeps the dialog mounted through its exit animation, which
    // never fires an animationend event in this test environment, so it
    // can't be observed leaving the DOM here (InGameMenu.test.tsx doesn't
    // either). data-closed flips synchronously with the open state though.
    expect(dialog.hasAttribute("data-closed")).toBe(true);
  });

  it("Restart puts the board back to the opening position and closes the menu", () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen config={{ mode: "pvp" }} onQuit={() => {}} />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);
    const sides = () =>
      container.querySelectorAll(`.${turnIndicatorStyles.side}`);

    fireEvent.click(buttons()[19]); // d3
    vi.runAllTimers();
    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
    expect(sides()[1].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    ); // white's turn now

    fireEvent.click(screen.getByLabelText("Menu"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByText("Restart"));
    vi.advanceTimersByTime(150); // let the confirm view finish swapping in
    fireEvent.click(screen.getByText("Restart"));

    expect(dialog.hasAttribute("data-closed")).toBe(true);
    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();
    expect(sides()[0].classList.contains(turnIndicatorStyles.active)).toBe(
      true,
    ); // back to black's turn
  });

  it("calls onQuit when Quit to Title is clicked in the menu", async () => {
    const onQuit = vi.fn();
    render(() => <GameScreen config={{ mode: "pvp" }} onQuit={onQuit} />);

    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Quit to Title"));
    // The confirm view's button has the same label as the main menu's, so
    // wait on its unique title before clicking it again.
    await screen.findByText("Quit to title?");
    fireEvent.click(screen.getByText("Quit to Title"));

    expect(onQuit).toHaveBeenCalledOnce();
  });

  it("shows ResultOverlay with the real score once the store reaches status 'ended', and Rematch resets the game", async () => {
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

    const { default: GameScreenWithGameOver } = await import("./GameScreen");

    vi.useFakeTimers();
    const { container } = render(() => (
      <GameScreenWithGameOver config={{ mode: "pvp" }} onQuit={() => {}} />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    fireEvent.click(buttons()[19]); // d3, flips one white disc to black
    vi.runAllTimers();

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Black wins")).not.toBeNull();
    expect(dialog.getByText("4")).not.toBeNull(); // black: 2 initial + 1 placed + 1 flipped
    expect(dialog.getByText("1")).not.toBeNull(); // white: 2 initial - 1 flipped

    fireEvent.click(screen.getByText("Rematch"));

    expect(screen.queryByText("Black wins")).toBeNull();
    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();
  });

  it("calls onQuit when Back to Title is clicked on the result overlay", async () => {
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

    const { default: GameScreenWithGameOver } = await import("./GameScreen");

    vi.useFakeTimers();
    const onQuit = vi.fn();
    const { container } = render(() => (
      <GameScreenWithGameOver config={{ mode: "pvp" }} onQuit={onQuit} />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    fireEvent.click(buttons()[19]);
    vi.runAllTimers();

    fireEvent.click(screen.getByText("Back to Title"));

    expect(onQuit).toHaveBeenCalledOnce();
  });
});

// A hand-rolled mock of the Worker aiClient talks to (same shape as
// src/ai/aiClient.test.ts's MockWorker), so these tests exercise the real
// aiClient/GameScreen wiring without touching the real Edax engine.
class MockWorker {
  onmessage: ((event: MessageEvent<WorkerToMain>) => void) | null = null;
  postMessage = vi.fn<(message: MainToWorker) => void>();
  terminate = vi.fn();

  emit(data: WorkerToMain): void {
    this.onmessage?.({ data } as MessageEvent<WorkerToMain>);
  }

  lastSearchRequestId(): number {
    const call = this.postMessage.mock.calls.findLast(
      ([m]) => m.type === "search",
    );
    if (call?.[0].type !== "search") {
      throw new Error("no search message was posted");
    }
    return call[0].requestId;
  }
}

describe("GameScreen AI orchestration", () => {
  let workers: MockWorker[];

  class TrackedMockWorker extends MockWorker {
    constructor() {
      super();
      workers.push(this);
    }
  }

  beforeEach(() => {
    workers = [];
    vi.stubGlobal("Worker", TrackedMockWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts a search on the AI's turn, locks the board while thinking, and applies the returned move", async () => {
    vi.useFakeTimers();

    // playerColor 2 (white) means the AI plays black, which moves first -
    // the search starts as soon as the component mounts.
    const { container } = render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={() => {}}
      />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Thinking…")).not.toBeNull();

    workers[0].emit({ type: "ready" });
    await Promise.resolve(); // let init()'s microtasks settle so the search is posted

    const requestId = workers[0].lastSearchRequestId();
    workers[0].emit({ type: "bestMove", requestId, move: 19 }); // d3
    await vi.runAllTimersAsync(); // aiClient's minimum-thinking-time delay

    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
    expect(screen.queryByText("Thinking…")).toBeNull();
    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(false);
    // Regression check for the batch() fix in createGameStore.ts: store.play()
    // is called here from outside a DOM-event context (after an await), which
    // is exactly the condition under which a torn intermediate state could
    // make this same effect fire a spurious second search.
    expect(
      workers[0].postMessage.mock.calls.filter(([m]) => m.type === "search"),
    ).toHaveLength(1);
  });

  it("retries once on a search failure, then shows the crash overlay on a second failure", async () => {
    const { container } = render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={() => {}}
      />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    workers[0].emit({ type: "ready" });
    await Promise.resolve();

    const firstRequestId = workers[0].lastSearchRequestId();
    workers[0].emit({
      type: "error",
      fatal: false,
      requestId: firstRequestId,
      message: "search failed",
    });

    // one retry: a second search is posted with a fresh requestId instead of
    // showing the crash overlay right away
    await waitFor(() => {
      expect(
        workers[0].postMessage.mock.calls.filter(([m]) => m.type === "search"),
      ).toHaveLength(2);
    });
    expect(screen.queryByText("The computer opponent crashed.")).toBeNull();
    const secondRequestId = workers[0].lastSearchRequestId();
    expect(secondRequestId).not.toBe(firstRequestId);

    workers[0].emit({
      type: "error",
      fatal: false,
      requestId: secondRequestId,
      message: "search failed again",
    });

    await waitFor(() => {
      expect(screen.getByText("The computer opponent crashed.")).not.toBeNull();
    });
    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(true);
    // Regression check: without disabling the menu button here too, a player
    // could still open InGameMenu from behind the crash overlay and Restart,
    // which resets the board but never clears aiCrashed - soft-locking it.
    expect((screen.getByLabelText("Menu") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("closes an already-open menu when the AI crashes, so Restart can't reach a permanently disabled board", async () => {
    render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={() => {}}
      />
    ));

    fireEvent.click(screen.getByLabelText("Menu"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("data-closed")).toBe(false);

    workers[0].emit({ type: "ready" });
    await Promise.resolve();

    const firstRequestId = workers[0].lastSearchRequestId();
    workers[0].emit({
      type: "error",
      fatal: false,
      requestId: firstRequestId,
      message: "search failed",
    });

    await waitFor(() => {
      expect(
        workers[0].postMessage.mock.calls.filter(([m]) => m.type === "search"),
      ).toHaveLength(2);
    });
    const secondRequestId = workers[0].lastSearchRequestId();
    workers[0].emit({
      type: "error",
      fatal: false,
      requestId: secondRequestId,
      message: "search failed again",
    });

    await waitFor(() => {
      expect(screen.getByText("The computer opponent crashed.")).not.toBeNull();
    });
    expect(dialog.hasAttribute("data-closed")).toBe(true);
  });

  it("disables the menu button once AI init fails, so the menu can't be opened from behind the error banner", async () => {
    render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={() => {}}
      />
    ));

    const menuButton = screen.getByLabelText("Menu") as HTMLButtonElement;
    expect(menuButton.disabled).toBe(false);

    // Same race as the aiCrashed regression above: open the menu first, so a
    // failure that arrives while it's already open has to force it closed
    // rather than merely disabling the trigger button. (getByLabelText("Menu")
    // can't be reused once the dialog is open - its title is also "Menu",
    // which then matches too.)
    fireEvent.click(menuButton);
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("data-closed")).toBe(false);

    workers[0].emit({
      type: "error",
      fatal: true,
      message: "worker failed to load",
    });

    await waitFor(() => {
      expect(
        screen.getByText("The computer opponent could not start."),
      ).not.toBeNull();
    });
    expect(menuButton.disabled).toBe(true);
    expect(dialog.hasAttribute("data-closed")).toBe(true);
  });

  it("defers an AI move that resolves while the menu is open, and applies it once the menu closes", async () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={() => {}}
      />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const requestId = workers[0].lastSearchRequestId();

    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByRole("dialog").hasAttribute("data-closed")).toBe(false);

    workers[0].emit({ type: "bestMove", requestId, move: 19 }); // d3
    await vi.runAllTimersAsync();

    // resolved while the menu is open: not applied yet, but thinking is
    // already cleared (per the GameScreen.tsx comment: thinking resets right
    // after the await, before checking whether to defer)
    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();
    expect(screen.queryByText("Thinking…")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
  });

  it("Restart cancels an in-flight search: the board resets, a stale reply never lands, and a fresh search follows", async () => {
    vi.useFakeTimers();

    const { container } = render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={() => {}}
      />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const staleRequestId = workers[0].lastSearchRequestId();

    // Restart during the AI's very first search of the game: turn/animating/
    // status all already hold their post-reset values, so without the
    // generation counter in createGameStore.ts, the AI effect would never
    // re-run and no new search would ever be requested (a real soft-lock
    // found during verification of this task).
    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Restart"));
    vi.advanceTimersByTime(150); // let the confirm view finish swapping in
    fireEvent.click(screen.getByText("Restart"));

    // the stale reply, arriving after Restart, must never apply to the reset game
    workers[0].emit({ type: "bestMove", requestId: staleRequestId, move: 19 });
    await Promise.resolve();

    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();

    // a fresh search must have been requested for the reset game, with a new
    // requestId distinct from the cancelled one
    const freshRequestId = workers[0].lastSearchRequestId();
    expect(freshRequestId).not.toBe(staleRequestId);

    workers[0].emit({ type: "bestMove", requestId: freshRequestId, move: 19 });
    await vi.runAllTimersAsync();

    expect(buttons()[19].querySelector('[class*="disc"]')).not.toBeNull();
    expect(screen.queryByText("Thinking…")).toBeNull();
  });

  it("Quit to title cancels the in-flight search: a stale reply afterward causes no crash and no move", async () => {
    const onQuit = vi.fn();
    const { container } = render(() => (
      <GameScreen
        config={{ mode: "ai", difficulty: "easy", playerColor: 2 }}
        onQuit={onQuit}
      />
    ));
    const buttons = () => container.querySelectorAll(`.${boardStyles.cell}`);

    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const staleRequestId = workers[0].lastSearchRequestId();

    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Quit to Title"));
    // The confirm view's button has the same label as the main menu's, so
    // wait on its unique title before clicking it again.
    await screen.findByText("Quit to title?");
    fireEvent.click(screen.getByText("Quit to Title"));

    expect(onQuit).toHaveBeenCalledOnce();

    // the requestId guard (unit-tested directly in aiClient.test.ts) is what
    // makes this safe: cancel() bumped it, so this reply must be dropped
    workers[0].emit({ type: "bestMove", requestId: staleRequestId, move: 19 });
    await Promise.resolve();

    expect(buttons()[19].querySelector('[class*="disc"]')).toBeNull();
    expect(screen.queryByText("The computer opponent crashed.")).toBeNull();
  });
});
