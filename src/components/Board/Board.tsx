import { createMemo, For, Index, Show } from "solid-js";
import { SIZE } from "../../logic/rules";
import type { Board as BoardState, Player } from "../../logic/types";
import Disc from "../Disc/Disc";
import styles from "./Board.module.css";

const STAR_POINTS: readonly (readonly [number, number])[] = [
  [2, 2],
  [2, 6],
  [6, 2],
  [6, 6],
];

type BoardProps = {
  board: BoardState;
  legalMoves: number[];
  lastMove: number | null;
  flipDelays: Record<number, number>;
  turn: Player;
  disabled: boolean;
  onCellClick: (index: number) => void;
};

function Board(props: BoardProps) {
  return (
    <div class={styles.frame}>
      <div class={styles.board}>
        <For each={STAR_POINTS}>
          {([row, col]) => (
            <div
              class={styles.star}
              style={{
                top: `calc(${row} / ${SIZE} * 100%)`,
                left: `calc(${col} / ${SIZE} * 100%)`,
              }}
            />
          )}
        </For>
        <Index each={props.board}>
          {(cell, index) => {
            const isHinted = createMemo(
              () => !props.disabled && props.legalMoves.includes(index),
            );

            return (
              <button
                type="button"
                class={styles.cell}
                classList={{
                  [styles.hint]: isHinted() && props.turn === 1,
                  [styles.hintWhite]: isHinted() && props.turn === 2,
                  [styles.lastMove]: index === props.lastMove,
                }}
                disabled={props.disabled}
                onClick={() => props.onCellClick(index)}
              >
                <Show when={cell() !== 0}>
                  <Disc
                    player={cell() as Player}
                    flipDelayMs={props.flipDelays[index] ?? 0}
                  />
                </Show>
              </button>
            );
          }}
        </Index>
      </div>
    </div>
  );
}

export default Board;
