import { RadioGroup } from "@kobalte/core/radio-group";
import { createSignal, For } from "solid-js";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "../../ai/difficulty";
import type { Difficulty, GameConfig, Player } from "../../logic/types";
import styles from "./TitleScreen.module.css";

type TitleScreenProps = {
  onStart: (config: GameConfig) => void;
  aiAvailable: boolean;
  aiProbed: boolean;
};

type Mode = "pvp" | "ai";

function TitleScreen(props: TitleScreenProps) {
  // AI opponent is the intended default. aiAvailable starts false and only
  // resolves asynchronously (see App.tsx's probe), but defaulting mode to
  // "ai" up front - rather than starting at "pvp" and switching over once
  // the probe resolves - avoids a visible flip of the selected option on
  // most loads. The "vs AI" chip stays disabled until aiAvailable catches
  // up, and handleStart falls back to pvp if it's clicked before that.
  const [mode, setMode] = createSignal<Mode>("ai");
  const [difficulty, setDifficulty] = createSignal<Difficulty>("normal");
  const [playerColor, setPlayerColor] = createSignal<Player>(1);

  function handleModeChange(value: string) {
    if (value === "ai" && !props.aiAvailable) return;
    setMode(value as Mode);
  }

  function handleStart() {
    if (mode() === "ai" && props.aiAvailable) {
      props.onStart({
        mode: "ai",
        difficulty: difficulty(),
        playerColor: playerColor(),
      });
    } else {
      props.onStart({ mode: "pvp" });
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
        <p
          class={styles.note}
          data-hidden={props.aiProbed && !props.aiAvailable ? undefined : ""}
        >
          Computer opponent unavailable
        </p>

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
