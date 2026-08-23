import { RadioGroup } from "@kobalte/core/radio-group";
import { createEffect, createSignal, For, Show } from "solid-js";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "../../ai/difficulty";
import type { Difficulty, GameConfig, Player } from "../../logic/types";
import styles from "./TitleScreen.module.css";

type TitleScreenProps = {
  onStart: (config: GameConfig) => void;
  aiAvailable: boolean;
};

type Mode = "pvp" | "ai";

function TitleScreen(props: TitleScreenProps) {
  const [mode, setMode] = createSignal<Mode>("pvp");
  const [modeTouched, setModeTouched] = createSignal(false);
  const [difficulty, setDifficulty] = createSignal<Difficulty>("normal");
  const [playerColor, setPlayerColor] = createSignal<Player>(1);

  // AI opponent is the intended default, but aiAvailable starts false and
  // only resolves asynchronously (see App.tsx's probe) - switch to it once
  // ready, unless the player already made an explicit choice.
  createEffect(() => {
    if (props.aiAvailable && !modeTouched()) {
      setMode("ai");
    }
  });

  function handleModeChange(value: string) {
    if (value === "ai" && !props.aiAvailable) return;
    setModeTouched(true);
    setMode(value as Mode);
  }

  function handleStart() {
    if (mode() === "pvp") {
      props.onStart({ mode: "pvp" });
    } else {
      props.onStart({
        mode: "ai",
        difficulty: difficulty(),
        playerColor: playerColor(),
      });
    }
  }

  return (
    <div class={styles.screen}>
      <h1 class={styles.logo}>REVERSI</h1>

      <div class={styles.menu}>
        <RadioGroup
          class={styles.field}
          value={mode()}
          onChange={handleModeChange}
          name="mode"
        >
          <RadioGroup.Label class={styles.srOnly}>Opponent</RadioGroup.Label>
          <div class={styles.segmented}>
            <RadioGroup.Item
              value="ai"
              class={styles.item}
              disabled={!props.aiAvailable}
            >
              <RadioGroup.ItemInput />
              <RadioGroup.ItemControl class={styles.itemControl}>
                <RadioGroup.ItemLabel class={styles.itemLabel}>
                  vs AI
                </RadioGroup.ItemLabel>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
            <RadioGroup.Item value="pvp" class={styles.item}>
              <RadioGroup.ItemInput />
              <RadioGroup.ItemControl class={styles.itemControl}>
                <RadioGroup.ItemLabel class={styles.itemLabel}>
                  vs Player
                </RadioGroup.ItemLabel>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
          </div>
        </RadioGroup>
        <Show when={!props.aiAvailable}>
          <p class={styles.note}>Computer opponent unavailable</p>
        </Show>

        <div
          class={styles.aiPanel}
          data-disabled={mode() !== "ai" ? "" : undefined}
        >
          <RadioGroup
            class={styles.field}
            value={difficulty()}
            onChange={(value) => setDifficulty(value as Difficulty)}
            name="difficulty"
            disabled={mode() !== "ai"}
          >
            <RadioGroup.Label class={styles.difficultyLabel}>
              Difficulty
            </RadioGroup.Label>
            <p class={styles.difficultyCaption}>
              {DIFFICULTY_LABELS[difficulty()]}
            </p>
            <div class={styles.segmented}>
              <For each={DIFFICULTIES}>
                {(level, index) => (
                  <RadioGroup.Item value={level} class={styles.item}>
                    <RadioGroup.ItemInput />
                    <RadioGroup.ItemControl class={styles.itemControl}>
                      <span aria-hidden="true">{index() + 1}</span>
                      <RadioGroup.ItemLabel class={styles.srOnly}>
                        {DIFFICULTY_LABELS[level]}
                      </RadioGroup.ItemLabel>
                    </RadioGroup.ItemControl>
                  </RadioGroup.Item>
                )}
              </For>
            </div>
          </RadioGroup>

          <RadioGroup
            class={styles.field}
            value={playerColor() === 1 ? "black" : "white"}
            onChange={(value) => setPlayerColor(value === "black" ? 1 : 2)}
            name="player-color"
            disabled={mode() !== "ai"}
          >
            <RadioGroup.Label class={styles.srOnly}>Play as</RadioGroup.Label>
            <div class={styles.segmented}>
              <RadioGroup.Item value="black" class={styles.item}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemControl class={styles.itemControl}>
                  <RadioGroup.ItemLabel class={styles.itemLabel}>
                    Black
                  </RadioGroup.ItemLabel>
                </RadioGroup.ItemControl>
              </RadioGroup.Item>
              <RadioGroup.Item value="white" class={styles.item}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemControl class={styles.itemControl}>
                  <RadioGroup.ItemLabel class={styles.itemLabel}>
                    White
                  </RadioGroup.ItemLabel>
                </RadioGroup.ItemControl>
              </RadioGroup.Item>
            </div>
          </RadioGroup>
        </div>

        <button type="button" class={styles.button} onClick={handleStart}>
          Start Game
        </button>
      </div>
    </div>
  );
}

export default TitleScreen;
