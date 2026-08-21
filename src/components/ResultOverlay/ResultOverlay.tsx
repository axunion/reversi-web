import { Dialog } from "@kobalte/core/dialog";
import type { GameConfig, Outcome, Score } from "../../logic/types";
import DiscCount from "../DiscCount/DiscCount";
import styles from "./ResultOverlay.module.css";

type ResultOverlayProps = {
  score: Score;
  winner: Outcome;
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
              <DiscCount player={1} count={props.score.black} />
            </div>
            <div class={styles.side}>
              <DiscCount player={2} count={props.score.white} />
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
