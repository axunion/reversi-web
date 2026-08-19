import type { Difficulty, GameConfig } from "../../logic/types";
import styles from "./MatchInfo.module.css";

type MatchInfoProps = {
  config: GameConfig;
  score: { black: number; white: number };
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  casual: "Casual",
  normal: "Normal",
  hard: "Hard",
  expert: "Expert",
};

function modeLabel(config: GameConfig): string {
  if (config.mode === "pvp") return "Player vs Player";
  return `vs Computer · ${DIFFICULTY_LABELS[config.difficulty]}`;
}

function MatchInfo(props: MatchInfoProps) {
  const total = () => props.score.black + props.score.white;
  const blackPct = () => (props.score.black / total()) * 100;

  return (
    <div class={styles.info}>
      <span class={styles.badge}>{modeLabel(props.config)}</span>
      <div
        class={styles.ratioBar}
        role="img"
        aria-label={`${props.score.black} black discs, ${props.score.white} white discs`}
      >
        <div
          class={styles.ratioBlack}
          style={{ "flex-basis": `${blackPct()}%` }}
        />
        <div
          class={styles.ratioWhite}
          style={{ "flex-basis": `${100 - blackPct()}%` }}
        />
      </div>
    </div>
  );
}

export default MatchInfo;
