import { createMemo } from "solid-js";
import Board from "../../components/Board/Board";
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

  const disabled = createMemo(
    () => store.state.animating || store.state.status !== "playing",
  );

  return (
    <div class={styles.screen}>
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
    </div>
  );
}

export default GameScreen;
