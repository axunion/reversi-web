import { RadioGroup } from "@kobalte/core/radio-group";
import { createSignal, For, Show } from "solid-js";
import type { Difficulty, GameConfig, Player } from "../../logic/types";
import styles from "./TitleScreen.module.css";

type TitleScreenProps = {
  onStart: (config: GameConfig) => void;
  aiAvailable: boolean;
};

type Step = "main" | "aiSetup";

const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

function TitleScreen(props: TitleScreenProps) {
  const [step, setStep] = createSignal<Step>("main");
  const [difficulty, setDifficulty] = createSignal<Difficulty>("normal");
  const [playerColor, setPlayerColor] = createSignal<Player>(1);

  function startAiGame() {
    props.onStart({
      mode: "ai",
      difficulty: difficulty(),
      playerColor: playerColor(),
    });
  }

  return (
    <div class={styles.screen}>
      <h1 class={styles.logo}>REVERSI</h1>

      <Show when={step() === "main"}>
        <div class={styles.menu}>
          <button
            type="button"
            class={styles.button}
            onClick={() => props.onStart({ mode: "pvp" })}
          >
            Two Players
          </button>
          <div>
            <button
              type="button"
              class={styles.button}
              disabled={!props.aiAvailable}
              onClick={() => setStep("aiSetup")}
            >
              Versus Computer
            </button>
            <Show when={!props.aiAvailable}>
              <p class={styles.note}>Computer opponent unavailable</p>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={step() === "aiSetup"}>
        <div class={styles.menu}>
          <RadioGroup
            class={styles.field}
            value={difficulty()}
            onChange={(value) => setDifficulty(value as Difficulty)}
            name="difficulty"
          >
            <RadioGroup.Label class={styles.label}>Difficulty</RadioGroup.Label>
            <div class={styles.segmented}>
              <For each={DIFFICULTIES}>
                {(level) => (
                  <RadioGroup.Item value={level} class={styles.item}>
                    <RadioGroup.ItemInput />
                    <RadioGroup.ItemControl class={styles.itemControl}>
                      <RadioGroup.ItemLabel class={styles.itemLabel}>
                        {capitalize(level)}
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
          >
            <RadioGroup.Label class={styles.label}>Play as</RadioGroup.Label>
            <div class={styles.segmented}>
              <RadioGroup.Item value="black" class={styles.item}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemControl class={styles.itemControl}>
                  <RadioGroup.ItemLabel class={styles.itemLabel}>
                    Black (first)
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

          <button type="button" class={styles.button} onClick={startAiGame}>
            Start Game
          </button>
          <button
            type="button"
            class={styles.backButton}
            onClick={() => setStep("main")}
          >
            Back
          </button>
        </div>
      </Show>
    </div>
  );
}

export default TitleScreen;
