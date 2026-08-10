import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("App", () => {
  it("starts on the title screen and switches to the game screen on Two Players", () => {
    render(() => <App />);

    expect(screen.getByText("Two Players")).not.toBeNull();

    fireEvent.click(screen.getByText("Two Players"));

    expect(screen.queryByText("Two Players")).toBeNull();
    expect(screen.getByLabelText("Menu")).not.toBeNull();
  });

  it("returns to the title screen via Quit to Title in the in-game menu", () => {
    render(() => <App />);

    fireEvent.click(screen.getByText("Two Players"));
    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Quit to Title"));

    expect(screen.getByText("Two Players")).not.toBeNull();
  });
});
