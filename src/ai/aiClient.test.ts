import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAiClient } from "./aiClient";
import type { MainToWorker, WorkerToMain } from "./protocol";

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
  vi.useRealTimers();
});

describe("createAiClient", () => {
  it("init() is idempotent and resolves once the worker replies ready", async () => {
    const client = createAiClient();

    const first = client.init();
    const second = client.init();

    expect(second).toBe(first);
    expect(workers).toHaveLength(1);
    expect(workers[0].postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "init",
    });

    workers[0].emit({ type: "ready" });
    await expect(first).resolves.toBeUndefined();
  });

  it("init() rejects on a fatal error", async () => {
    const client = createAiClient();

    const ready = client.init();
    workers[0].emit({
      type: "error",
      fatal: true,
      message: "wasm compile error",
    });

    await expect(ready).rejects.toThrow("wasm compile error");
  });

  it("getBestMove resolves with the move the worker reports, after the minimum thinking delay", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const movePromise = client.getBestMove([0, 0], 1, 5);
    workers[0].emit({ type: "ready" });
    await Promise.resolve(); // let init()'s microtasks settle so the search is posted

    const requestId = workers[0].lastSearchRequestId();
    workers[0].emit({ type: "bestMove", requestId, move: 19 });

    await vi.runAllTimersAsync();
    await expect(movePromise).resolves.toBe(19);
  });

  it("rejects on a non-fatal search error", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const movePromise = client.getBestMove([0, 0], 1, 5);
    const assertion = expect(movePromise).rejects.toThrow("search failed");
    workers[0].emit({ type: "ready" });
    await Promise.resolve();

    const requestId = workers[0].lastSearchRequestId();
    workers[0].emit({
      type: "error",
      fatal: false,
      requestId,
      message: "search failed",
    });

    await vi.runAllTimersAsync();
    await assertion;
  });

  it("ignores a stale non-fatal error for a cancelled search, instead of rejecting the new one", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const first = client.getBestMove([0, 0], 1, 5);
    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const staleRequestId = workers[0].lastSearchRequestId();

    client.cancel();

    const second = client.getBestMove([0, 0], 1, 5);
    await Promise.resolve();
    const currentRequestId = workers[0].lastSearchRequestId();
    expect(currentRequestId).not.toBe(staleRequestId);

    // the worker is still grinding on the cancelled search and eventually
    // reports an error for it - this must not reject the new, unrelated search
    workers[0].emit({
      type: "error",
      fatal: false,
      requestId: staleRequestId,
      message: "stale search failed",
    });
    workers[0].emit({
      type: "bestMove",
      requestId: currentRequestId,
      move: 44,
    });

    await vi.runAllTimersAsync();
    await expect(second).resolves.toBe(44);

    let firstSettled = false;
    first.then(
      () => {
        firstSettled = true;
      },
      () => {
        firstSettled = true;
      },
    );
    await vi.runAllTimersAsync();
    expect(firstSettled).toBe(false);
  });

  it("cancel() invalidates the in-flight request: it never settles, and a stale reply is ignored", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const movePromise = client.getBestMove([0, 0], 1, 5);
    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const staleRequestId = workers[0].lastSearchRequestId();

    client.cancel();

    // the stale reply, arriving after cancel, must not resolve the cancelled promise
    workers[0].emit({ type: "bestMove", requestId: staleRequestId, move: 19 });
    await vi.runAllTimersAsync();

    let settled = false;
    movePromise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await vi.runAllTimersAsync();
    expect(settled).toBe(false);
  });

  it("after cancel(), a new getBestMove() uses a fresh requestId that the stale reply cannot satisfy", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const firstMove = client.getBestMove([0, 0], 1, 5);
    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const firstRequestId = workers[0].lastSearchRequestId();

    client.cancel();

    const secondMove = client.getBestMove([0, 0], 1, 5);
    await Promise.resolve();
    const secondRequestId = workers[0].lastSearchRequestId();

    expect(secondRequestId).not.toBe(firstRequestId);

    // a stale reply for the cancelled request must not resolve the new promise either
    workers[0].emit({ type: "bestMove", requestId: firstRequestId, move: 0 });
    workers[0].emit({ type: "bestMove", requestId: secondRequestId, move: 44 });

    await vi.runAllTimersAsync();
    await expect(secondMove).resolves.toBe(44);

    let firstSettled = false;
    firstMove.then(
      () => {
        firstSettled = true;
      },
      () => {
        firstSettled = true;
      },
    );
    await vi.runAllTimersAsync();
    expect(firstSettled).toBe(false);
  });

  it("cancel() is a no-op when no search is pending", () => {
    const client = createAiClient();

    expect(() => client.cancel()).not.toThrow();
  });

  it("a duplicate ready message after init has already resolved is harmless", async () => {
    const client = createAiClient();

    const ready = client.init();
    workers[0].emit({ type: "ready" });
    await expect(ready).resolves.toBeUndefined();

    expect(() => workers[0].emit({ type: "ready" })).not.toThrow();
    await expect(ready).resolves.toBeUndefined();
  });

  it("getBestMove rejects with a single-flight error if called again while a search is genuinely pending", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const first = client.getBestMove([0, 0], 1, 5);
    workers[0].emit({ type: "ready" });
    await Promise.resolve(); // let init()'s microtasks settle so pending is actually set

    const second = client.getBestMove([0, 0], 1, 5);
    await expect(second).rejects.toThrow(
      "getBestMove called while a search is already in flight",
    );

    // clean up the still-pending first search so it doesn't time out unhandled
    const requestId = workers[0].lastSearchRequestId();
    workers[0].emit({ type: "bestMove", requestId, move: 19 });
    await vi.runAllTimersAsync();
    await expect(first).resolves.toBe(19);
  });

  it("getBestMove rejects a second call made before init() has resolved, instead of racing past the guard", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    // Neither call has had a chance to await init() to completion yet, since
    // the worker hasn't replied "ready" - this is the exact window where the
    // single-flight guard could otherwise be bypassed by both calls.
    const first = client.getBestMove([0, 0], 1, 5);
    const second = client.getBestMove([0, 0], 1, 5);

    await expect(second).rejects.toThrow(
      "getBestMove called while a search is already in flight",
    );

    workers[0].emit({ type: "ready" });
    await Promise.resolve();

    expect(
      workers[0].postMessage.mock.calls.filter(([m]) => m.type === "search"),
    ).toHaveLength(1);

    const requestId = workers[0].lastSearchRequestId();
    workers[0].emit({ type: "bestMove", requestId, move: 19 });
    await vi.runAllTimersAsync();
    await expect(first).resolves.toBe(19);
  });

  it("dispose() terminates the worker", () => {
    const client = createAiClient();
    client.init();

    client.dispose();

    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it("after dispose(), a new getBestMove() creates a brand new worker rather than reusing the terminated one", async () => {
    vi.useFakeTimers();
    const client = createAiClient();

    const first = client.getBestMove([0, 0], 1, 5);
    workers[0].emit({ type: "ready" });
    await Promise.resolve();
    const firstRequestId = workers[0].lastSearchRequestId();
    workers[0].emit({ type: "bestMove", requestId: firstRequestId, move: 19 });
    await vi.runAllTimersAsync();
    await expect(first).resolves.toBe(19);

    client.dispose();
    expect(workers[0].terminate).toHaveBeenCalledOnce();

    const second = client.getBestMove([0, 0], 1, 5);
    await Promise.resolve();

    expect(workers).toHaveLength(2);
    expect(workers[1].postMessage).toHaveBeenCalledWith({ type: "init" });

    workers[1].emit({ type: "ready" });
    await Promise.resolve();
    const secondRequestId = workers[1].lastSearchRequestId();
    workers[1].emit({
      type: "bestMove",
      requestId: secondRequestId,
      move: 44,
    });
    await vi.runAllTimersAsync();
    await expect(second).resolves.toBe(44);
  });
});
