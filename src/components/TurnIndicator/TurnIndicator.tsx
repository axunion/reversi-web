import { Show } from "solid-js";
import type { Player } from "../../logic/types";
import Disc from "../Disc/Disc";
import styles from "./TurnIndicator.module.css";

type TurnIndicatorProps = {
  turn: Player;
  score: { black: number; white: number };
  thinking: boolean;
  passMessage: Player | null;
  moveNumber: number;
};

function TurnIndicator(props: TurnIndicatorProps) {
  return (
    <div class={styles.indicator}>
      <div
        class={styles.side}
        classList={{ [styles.active]: props.turn === 1 }}
      >
        <div class={styles.glyph}>
          <Disc player={1} flipDelayMs={0} />
        </div>
        <span>{props.score.black}</span>
      </div>
      <div class={styles.status}>
        <Show
          when={props.passMessage !== null}
          fallback={
            <Show
              when={props.thinking}
              fallback={<span>Move {props.moveNumber}</span>}
            >
              <span class={styles.thinking}>Thinking…</span>
            </Show>
          }
        >
          <span class={styles.pass}>Pass</span>
        </Show>
      </div>
      <div
        class={styles.side}
        classList={{ [styles.active]: props.turn === 2 }}
      >
        <div class={styles.glyph}>
          <Disc player={2} flipDelayMs={0} />
        </div>
        <span>{props.score.white}</span>
      </div>
    </div>
  );
}

export default TurnIndicator;
