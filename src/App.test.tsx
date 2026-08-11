import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { MainToWorker, WorkerToMain } from "./ai/protocol";

afterEach(cleanup);

describe("App", () => {
  it("starts on the title screen and switches to the game screen on Two Players", () => {
    render(() => <App />);

    expect(screen.getByText("Two Players")).not.toBeNull();

    fireEvent.click(screen.getByText("Two Players"));

    expect(screen.queryByText("Two Players")).toBeNull();
    expect(screen.getByLabelText("Menu")).not.toBeNull();
  });

  it("returns to the title screen via Quit to Title in the in-game menu", () => {
    render(() => <App />);

    fireEvent.click(screen.getByText("Two Players"));
    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Quit to Title"));

    expect(screen.getByText("Two Players")).not.toBeNull();
  });
});

// A hand-rolled mock of the Worker aiClient talks to (same shape as
// src/ai/aiClient.test.ts's MockWorker), so this test exercises the real
// App-level aiAvailable probe (spec 04 §6) without touching the real Edax
// engine.
class MockWorker {
  onmessage: ((event: MessageEvent<WorkerToMain>) => void) | null = null;
  postMessage = vi.fn<(message: MainToWorker) => void>();
  terminate = vi.fn();

  emit(data: WorkerToMain): void {
    this.onmessage?.({ data } as MessageEvent<WorkerToMain>);
  }
}

describe("App AI availability probe", () => {
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

  it("starts with Versus Computer disabled, then enables it once the probe worker reports ready, and disposes the probe", async () => {
    render(() => <App />);

    const versusComputerButton = () =>
      screen.getByText("Versus Computer") as HTMLButtonElement;

    expect(versusComputerButton().disabled).toBe(true);
    expect(screen.getByText("Computer opponent unavailable")).not.toBeNull();
    expect(workers).toHaveLength(1);

    workers[0].emit({ type: "ready" });
    await Promise.resolve(); // let the probe's init().then(...) settle
    await Promise.resolve(); // let the subsequent .finally(...) settle

    expect(versusComputerButton().disabled).toBe(false);
    expect(screen.queryByText("Computer opponent unavailable")).toBeNull();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it("leaves Versus Computer disabled if the probe worker reports a fatal init error, and still disposes the probe", async () => {
    render(() => <App />);

    const versusComputerButton = () =>
      screen.getByText("Versus Computer") as HTMLButtonElement;

    workers[0].emit({
      type: "error",
      fatal: true,
      message: "wasm compile error",
    });
    await Promise.resolve(); // let the probe's init().then(...) settle
    await Promise.resolve(); // let the subsequent .finally(...) settle

    expect(versusComputerButton().disabled).toBe(true);
    expect(screen.getByText("Computer opponent unavailable")).not.toBeNull();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
});
