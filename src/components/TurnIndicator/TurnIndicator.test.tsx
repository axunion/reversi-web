import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import TurnIndicator from "./TurnIndicator";
import styles from "./TurnIndicator.module.css";

afterEach(cleanup);

describe("TurnIndicator", () => {
  it("highlights black's side and shows scores when it is black's turn", () => {
    const { container } = render(() => (
      <TurnIndicator
        turn={1}
        score={{ black: 5, white: 3 }}
        thinking={false}
        passMessage={null}
      />
    ));

    const sides = container.querySelectorAll(`.${styles.side}`);
    expect(sides[0].classList.contains(styles.active)).toBe(true);
    expect(sides[1].classList.contains(styles.active)).toBe(false);
    expect(sides[0].textContent).toContain("5");
    expect(sides[1].textContent).toContain("3");
  });

  it("highlights white's side when it is white's turn", () => {
    const { container } = render(() => (
      <TurnIndicator
        turn={2}
        score={{ black: 5, white: 3 }}
        thinking={false}
        passMessage={null}
      />
    ));

    const sides = container.querySelectorAll(`.${styles.side}`);
    expect(sides[0].classList.contains(styles.active)).toBe(false);
    expect(sides[1].classList.contains(styles.active)).toBe(true);
  });

  it("shows the Thinking indicator only when thinking is true", () => {
    const { container, unmount } = render(() => (
      <TurnIndicator
        turn={1}
        score={{ black: 2, white: 2 }}
        thinking={true}
        passMessage={null}
      />
    ));

    expect(container.querySelector(`.${styles.thinking}`)).not.toBeNull();
    unmount();

    const { container: notThinking } = render(() => (
      <TurnIndicator
        turn={1}
        score={{ black: 2, white: 2 }}
        thinking={false}
        passMessage={null}
      />
    ));

    expect(notThinking.querySelector(`.${styles.thinking}`)).toBeNull();
  });

  it("shows the Pass indicator only when passMessage is not null", () => {
    const { container, unmount } = render(() => (
      <TurnIndicator
        turn={1}
        score={{ black: 2, white: 2 }}
        thinking={false}
        passMessage={2}
      />
    ));

    expect(container.querySelector(`.${styles.pass}`)).not.toBeNull();
    unmount();

    const { container: noPass } = render(() => (
      <TurnIndicator
        turn={1}
        score={{ black: 2, white: 2 }}
        thinking={false}
        passMessage={null}
      />
    ));

    expect(noPass.querySelector(`.${styles.pass}`)).toBeNull();
  });
});
