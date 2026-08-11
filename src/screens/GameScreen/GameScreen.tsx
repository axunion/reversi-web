import { Menu } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import { createAiClient } from "../../ai/aiClient";
import { edaxLevel } from "../../ai/difficulty";
import Board from "../../components/Board/Board";
import InGameMenu from "../../components/InGameMenu/InGameMenu";
import ResultOverlay from "../../components/ResultOverlay/ResultOverlay";
import TurnIndicator from "../../components/TurnIndicator/TurnIndicator";
import { getLegalMoves, opponent } from "../../logic/rules";
import type {
  Board as BoardState,
  GameConfig,
  Player,
} from "../../logic/types";
import { createGameStore } from "./createGameStore";
import styles from "./GameScreen.module.css";

type GameScreenProps = {
  config: GameConfig;
  onQuit: () => void;
};

function GameScreen(props: GameScreenProps) {
  const store = createGameStore(props.config);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [pendingAiMove, setPendingAiMove] = createSignal<number | null>(null);
  const [aiInitFailed, setAiInitFailed] = createSignal(false);
  const [aiCrashed, setAiCrashed] = createSignal(false);

  // Narrowing props.config once, rather than re-checking props.config.mode at
  // every use site, gives every AI-only branch below typed access to
  // difficulty/playerColor without repeating the discriminant check.
  const aiConfig = props.config.mode === "ai" ? props.config : null;
  const aiClient = aiConfig ? createAiClient() : null;

  const disabled = createMemo(
    () =>
      store.state.animating ||
      store.state.status !== "playing" ||
      store.state.thinking ||
      aiInitFailed() ||
      aiCrashed(),
  );

  if (aiClient) {
    aiClient.init().catch(() => setAiInitFailed(true));
    onCleanup(() => aiClient.dispose());
  }

  async function requestAiMove(
    board: BoardState,
    mover: Player,
  ): Promise<number> {
    if (!aiClient || !aiConfig) throw new Error("AI is not available");
    const move = await aiClient.getBestMove(
      board,
      mover,
      edaxLevel(aiConfig.difficulty),
    );
    if (!getLegalMoves(board, mover).includes(move)) {
      throw new Error("AI reported an illegal move");
    }
    return move;
  }

  // spec 04 §6: one automatic retry on a search error/timeout/illegal reply,
  // then a blocking "computer opponent crashed" overlay - no random-move
  // fallback.
  async function requestAiMoveWithRetry(
    board: BoardState,
    mover: Player,
  ): Promise<number> {
    try {
      return await requestAiMove(board, mover);
    } catch {
      return await requestAiMove(board, mover);
    }
  }

  createEffect(() => {
    const turn = store.state.turn;
    const animating = store.state.animating;
    const status = store.state.status;

    if (!aiClient || !aiConfig || aiInitFailed()) return;
    if (status !== "playing" || animating) return;
    if (turn !== opponent(aiConfig.playerColor)) return;

    // Read untracked: this snapshot is only for the search call, not something
    // this effect should itself react to (see also the batch() fix in
    // createGameStore.ts, which addresses the same class of issue at its
    // source: tracking any store field that play() mutates makes this effect
    // fire again from inside its own move application).
    const board = untrack(() => store.state.board);
    const mover = turn;
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
      // store.play(move) below sets `animating`, which this effect tracks,
      // so it retriggers this same effect - and thus this cleanup - before
      // the async callback below reaches its own end. Resetting `thinking`
      // here, rather than relying on the callback to do it after the await,
      // means a cancelled run can never leave it stuck true.
      store.setThinking(false);
    });

    (async () => {
      store.setThinking(true);
      try {
        const move = await requestAiMoveWithRetry(board, mover);
        if (cancelled) return;
        store.setThinking(false);
        // spec 04 §5: if the menu opened during the search, apply the result
        // only after it closes (handled by the effect below); a Restart/Quit
        // in the meantime already cancelled this run via onCleanup above.
        if (menuOpen()) {
          setPendingAiMove(move);
        } else {
          store.play(move);
        }
      } catch {
        if (!cancelled) {
          store.setThinking(false);
          setAiCrashed(true);
        }
      }
    })();
  });

  createEffect(() => {
    const move = pendingAiMove();
    if (move === null || menuOpen()) return;
    setPendingAiMove(null);
    store.play(move);
  });

  function restart() {
    aiClient?.cancel();
    setPendingAiMove(null);
    store.reset();
    setMenuOpen(false);
  }

  function quitToTitle() {
    aiClient?.cancel();
    props.onQuit();
  }

  return (
    <div class={styles.screen}>
      <button
        type="button"
        class={styles.menuButton}
        aria-label="Menu"
        onClick={() => setMenuOpen(true)}
      >
        <Menu size={20} />
      </button>
      <TurnIndicator
        turn={store.state.turn}
        score={store.score()}
        thinking={store.state.thinking}
        passMessage={store.state.passMessage}
      />
      <Board
        board={store.state.board}
        legalMoves={store.legalMoves()}
        lastMove={store.state.lastMove}
        flipDelays={store.state.flipDelays}
        turn={store.state.turn}
        disabled={disabled()}
        onCellClick={store.play}
      />
      <InGameMenu
        open={menuOpen()}
        onResume={() => setMenuOpen(false)}
        onRestart={restart}
        onQuitToTitle={quitToTitle}
      />
      <Show when={store.state.status === "ended"}>
        {/* finishMove (createGameStore.ts) sets status then winner synchronously in the
            same call, with no yield between them, so winner is always populated by the
            time this Show's condition is observed to be true */}
        <ResultOverlay
          score={store.score()}
          winner={store.state.winner as NonNullable<typeof store.state.winner>}
          config={props.config}
          onRematch={store.reset}
          onQuitToTitle={quitToTitle}
        />
      </Show>
      <Show when={aiInitFailed()}>
        <div class={styles.errorBanner}>
          <p>The computer opponent could not start.</p>
          <button type="button" class={styles.button} onClick={quitToTitle}>
            Back to Title
          </button>
        </div>
      </Show>
      <Show when={aiCrashed()}>
        <div class={styles.crashOverlay}>
          <div class={styles.crashPanel}>
            <p>The computer opponent crashed.</p>
            <button type="button" class={styles.button} onClick={quitToTitle}>
              Back to Title
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default GameScreen;
