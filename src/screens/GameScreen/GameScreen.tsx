import { Menu } from "lucide-solid";
import { createMemo, createSignal, Show } from "solid-js";
import Board from "../../components/Board/Board";
import InGameMenu from "../../components/InGameMenu/InGameMenu";
import ResultOverlay from "../../components/ResultOverlay/ResultOverlay";
import TurnIndicator from "../../components/TurnIndicator/TurnIndicator";
import type { GameConfig } from "../../logic/types";
import { createGameStore } from "./createGameStore";
import styles from "./GameScreen.module.css";

type GameScreenProps = {
  config: GameConfig;
  onQuit: () => void;
};

function GameScreen(props: GameScreenProps) {
  const store = createGameStore(props.config);
  const [menuOpen, setMenuOpen] = createSignal(false);

  const disabled = createMemo(
    () => store.state.animating || store.state.status !== "playing",
  );

  function restart() {
    store.reset();
    setMenuOpen(false);
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
        onQuitToTitle={props.onQuit}
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
          onQuitToTitle={props.onQuit}
        />
      </Show>
    </div>
  );
}

export default GameScreen;
