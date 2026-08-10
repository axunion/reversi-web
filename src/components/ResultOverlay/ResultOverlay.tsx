import { Dialog } from "@kobalte/core/dialog";
import type { GameConfig, Player } from "../../logic/types";
import Disc from "../Disc/Disc";
import styles from "./ResultOverlay.module.css";

type ResultOverlayProps = {
  score: { black: number; white: number };
  winner: Player | "draw";
  config: GameConfig;
  onRematch: () => void;
  onQuitToTitle: () => void;
};

function headline(props: ResultOverlayProps): string {
  if (props.winner === "draw") return "Draw";
  if (props.config.mode === "ai") {
    return props.winner === props.config.playerColor
      ? "You win!"
      : "Computer wins";
  }
  return props.winner === 1 ? "Black wins" : "White wins";
}

function ResultOverlay(props: ResultOverlayProps) {
  return (
    <Dialog defaultOpen>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <Dialog.Content
          class={styles.content}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title class={styles.title}>{headline(props)}</Dialog.Title>
          <div class={styles.score}>
            <div class={styles.side}>
              <div class={styles.glyph}>
                <Disc player={1} flipDelayMs={0} />
              </div>
              <span>{props.score.black}</span>
            </div>
            <div class={styles.side}>
              <div class={styles.glyph}>
                <Disc player={2} flipDelayMs={0} />
              </div>
              <span>{props.score.white}</span>
            </div>
          </div>
          <button type="button" class={styles.button} onClick={props.onRematch}>
            Rematch
          </button>
          <button
            type="button"
            class={styles.button}
            onClick={props.onQuitToTitle}
          >
            Back to Title
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export default ResultOverlay;
