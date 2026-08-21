import type { Player } from "../../logic/types";
import Disc from "../Disc/Disc";
import styles from "./DiscCount.module.css";

type DiscCountProps = {
  player: Player;
  count: number;
};

function DiscCount(props: DiscCountProps) {
  return (
    <>
      <div class={styles.glyph}>
        <Disc player={props.player} flipDelayMs={0} />
      </div>
      <span>{props.count}</span>
    </>
  );
}

export default DiscCount;
