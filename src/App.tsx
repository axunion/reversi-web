import { createSignal, Match, Switch } from "solid-js";
import { createAiClient } from "./ai/aiClient";
import type { RestoreState } from "./gamePersistence";
import { loadGame } from "./gamePersistence";
import type { GameConfig } from "./logic/types";
import GameScreen from "./screens/GameScreen/GameScreen";
import TitleScreen from "./screens/TitleScreen/TitleScreen";

type Screen =
  | { name: "title" }
  | { name: "game"; config: GameConfig; restore?: RestoreState };

function initialScreen(): Screen {
  const saved = loadGame();
  if (!saved) return { name: "title" };
  const { config, ...restore } = saved;
  return { name: "game", config, restore };
}

function App() {
  const [screen, setScreen] = createSignal<Screen>(initialScreen());
  const [aiAvailable, setAiAvailable] = createSignal(false);

  // spec 04 §6: aiAvailable is decided once, at App level, from a probe
  // separate from any game's own aiClient (which GameScreen owns and disposes
  // itself) - disposed as soon as the probe settles, since nothing else needs it.
  const probeClient = createAiClient();
  probeClient
    .init()
    .then(
      () => setAiAvailable(true),
      () => setAiAvailable(false),
    )
    .finally(() => probeClient.dispose());

  return (
    <Switch>
      <Match when={screen().name === "title"}>
        <TitleScreen
          onStart={(config) => setScreen({ name: "game", config })}
          aiAvailable={aiAvailable()}
        />
      </Match>
      <Match when={screen().name === "game"}>
        <GameScreen
          config={(screen() as Extract<Screen, { name: "game" }>).config}
          restore={(screen() as Extract<Screen, { name: "game" }>).restore}
          onQuit={() => setScreen({ name: "title" })}
        />
      </Match>
    </Switch>
  );
}

export default App;
