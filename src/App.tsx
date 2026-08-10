import { createSignal, Match, Switch } from "solid-js";
import type { GameConfig } from "./logic/types";
import GameScreen from "./screens/GameScreen/GameScreen";
import TitleScreen from "./screens/TitleScreen/TitleScreen";

type Screen = { name: "title" } | { name: "game"; config: GameConfig };

function App() {
  const [screen, setScreen] = createSignal<Screen>({ name: "title" });

  return (
    <Switch>
      <Match when={screen().name === "title"}>
        <TitleScreen
          onStart={(config) => setScreen({ name: "game", config })}
          aiAvailable
        />
      </Match>
      <Match when={screen().name === "game"}>
        <GameScreen
          config={(screen() as Extract<Screen, { name: "game" }>).config}
          onQuit={() => setScreen({ name: "title" })}
        />
      </Match>
    </Switch>
  );
}

export default App;
