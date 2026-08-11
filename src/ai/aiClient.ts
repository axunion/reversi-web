import type { Board, Player } from "../logic/types";
import type { MainToWorker, WorkerToMain } from "./protocol";

const MIN_THINKING_MS = 600;
const SEARCH_TIMEOUT_MS = 30_000;

type PendingSearch = {
  id: number;
  resolve: (move: number) => void;
  reject: (error: Error) => void;
};

export function createAiClient() {
  let worker: Worker | null = null;
  let initPromise: Promise<void> | null = null;
  let resolveInit: (() => void) | null = null;
  let rejectInit: ((error: Error) => void) | null = null;

  let requestId = 0;
  let pending: PendingSearch | null = null;

  function handleMessage(data: WorkerToMain): void {
    if (data.type === "ready") {
      resolveInit?.();
      return;
    }

    if (data.type === "bestMove") {
      if (pending?.id === data.requestId) {
        pending.resolve(data.move);
        pending = null;
      }
      return;
    }

    // data.type === "error"
    if (data.fatal) {
      rejectInit?.(new Error(data.message));
      return;
    }
    if (pending && pending.id === data.requestId) {
      pending.reject(new Error(data.message));
      pending = null;
    }
  }

  function ensureWorker(): Worker {
    if (!worker) {
      worker = new Worker(new URL("./edax.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<WorkerToMain>) =>
        handleMessage(event.data);
    }
    return worker;
  }

  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = new Promise<void>((resolve, reject) => {
        resolveInit = resolve;
        rejectInit = reject;
        try {
          const w = ensureWorker();
          w.postMessage({ type: "init" } satisfies MainToWorker);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }
    return initPromise;
  }

  async function getBestMove(
    board: Board,
    turn: Player,
    level: number,
  ): Promise<number> {
    if (pending) {
      throw new Error("getBestMove called while a search is already in flight");
    }

    // Reserve `pending` synchronously, before any `await`, so a second call
    // made while this one is still awaiting init() also sees it and throws
    // above instead of both calls racing past the guard.
    const id = ++requestId;
    const result = new Promise<number>((resolve, reject) => {
      pending = { id, resolve, reject };
    });

    await init();
    const w = ensureWorker();

    const timeout = new Promise<number>((_resolve, reject) => {
      setTimeout(() => {
        if (pending?.id === id) {
          pending = null;
          reject(new Error("AI search timed out"));
        }
      }, SEARCH_TIMEOUT_MS);
    });

    const delay = new Promise<void>((resolve) => {
      setTimeout(resolve, MIN_THINKING_MS);
    });

    w.postMessage({
      type: "search",
      requestId: id,
      board: [...board],
      turn,
      level,
    } satisfies MainToWorker);

    return Promise.race([
      Promise.all([result, delay]).then(([move]) => move),
      timeout,
    ]);
  }

  function cancel(): void {
    requestId++;
    pending = null;
  }

  function dispose(): void {
    worker?.terminate();
    worker = null;
    initPromise = null;
    resolveInit = null;
    rejectInit = null;
    pending = null;
  }

  return { init, getBestMove, cancel, dispose };
}
