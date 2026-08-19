import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import MatchInfo from "./MatchInfo";
import styles from "./MatchInfo.module.css";

afterEach(cleanup);

describe("MatchInfo", () => {
  it("shows a PvP badge for a pvp match", () => {
    const { getByText } = render(() => (
      <MatchInfo config={{ mode: "pvp" }} score={{ black: 2, white: 2 }} />
    ));

    expect(getByText("Player vs Player")).not.toBeNull();
  });

  it.each([
    ["easy", "vs Computer · Easy"],
    ["casual", "vs Computer · Casual"],
    ["normal", "vs Computer · Normal"],
    ["hard", "vs Computer · Hard"],
    ["expert", "vs Computer · Expert"],
  ] as const)(
    "shows the difficulty badge for an ai match (%s)",
    (difficulty, expected) => {
      const { getByText } = render(() => (
        <MatchInfo
          config={{ mode: "ai", difficulty, playerColor: 1 }}
          score={{ black: 2, white: 2 }}
        />
      ));

      expect(getByText(expected)).not.toBeNull();
    },
  );

  it("splits the ratio bar according to the score", () => {
    const { container } = render(() => (
      <MatchInfo config={{ mode: "pvp" }} score={{ black: 3, white: 1 }} />
    ));

    const black = container.querySelector(
      `.${styles.ratioBlack}`,
    ) as HTMLElement;
    const white = container.querySelector(
      `.${styles.ratioWhite}`,
    ) as HTMLElement;

    expect(black.style.flexBasis).toBe("75%");
    expect(white.style.flexBasis).toBe("25%");
  });
});
