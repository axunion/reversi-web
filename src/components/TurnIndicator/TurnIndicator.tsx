import { Match, Switch } from "solid-js";
import type { Player, Score } from "../../logic/types";
import DiscCount from "../DiscCount/DiscCount";
import styles from "./TurnIndicator.module.css";

type TurnIndicatorProps = {
  turn: Player;
  score: Score;
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
        <DiscCount player={1} count={props.score.black} />
      </div>
      <div class={styles.status}>
        <Switch fallback={<span>Move {props.moveNumber}</span>}>
          <Match when={props.passMessage !== null}>
            <span class={styles.pass}>Pass</span>
          </Match>
          <Match when={props.thinking}>
            <span class={styles.thinking}>Thinking…</span>
          </Match>
        </Switch>
      </div>
      <div
        class={styles.side}
        classList={{ [styles.active]: props.turn === 2 }}
      >
        <DiscCount player={2} count={props.score.white} />
      </div>
    </div>
  );
}

export default TurnIndicator;
