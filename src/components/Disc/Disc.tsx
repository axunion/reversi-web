import type { Player } from "../../logic/types";
import styles from "./Disc.module.css";

type DiscProps = {
  player: Player;
  flipDelayMs: number;
};

function Disc(props: DiscProps) {
  return (
    <div
      class={styles.disc}
      classList={{ [styles.showWhite]: props.player === 2 }}
      style={{ "transition-delay": `${props.flipDelayMs}ms` }}
    >
      <div class={`${styles.face} ${styles.black}`} />
      <div class={`${styles.face} ${styles.white}`} />
    </div>
  );
}

export default Disc;
