import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameConfig } from "../../logic/types";
import ResultOverlay from "./ResultOverlay";

afterEach(cleanup);

const pvpConfig: GameConfig = { mode: "pvp" };

describe("ResultOverlay", () => {
  it("shows Draw for a tie in PvP mode", () => {
    render(() => (
      <ResultOverlay
        score={{ black: 32, white: 32 }}
        winner="draw"
        config={pvpConfig}
        onRematch={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("Draw")).not.toBeNull();
  });

  it("shows Draw for a tie in AI mode", () => {
    render(() => (
      <ResultOverlay
        score={{ black: 32, white: 32 }}
        winner="draw"
        config={{ mode: "ai", difficulty: "normal", playerColor: 1 }}
        onRematch={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("Draw")).not.toBeNull();
  });

  it("shows Black wins for a black victory in PvP mode", () => {
    render(() => (
      <ResultOverlay
        score={{ black: 40, white: 24 }}
        winner={1}
        config={pvpConfig}
        onRematch={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("Black wins")).not.toBeNull();
  });

  it("shows White wins for a white victory in PvP mode", () => {
    render(() => (
      <ResultOverlay
        score={{ black: 24, white: 40 }}
        winner={2}
        config={pvpConfig}
        onRematch={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("White wins")).not.toBeNull();
  });

  it("shows You win! when the human player wins in AI mode", () => {
    render(() => (
      <ResultOverlay
        score={{ black: 40, white: 24 }}
        winner={1}
        config={{ mode: "ai", difficulty: "normal", playerColor: 1 }}
        onRematch={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("You win!")).not.toBeNull();
  });

  it("shows Computer wins when the computer wins in AI mode", () => {
    render(() => (
      <ResultOverlay
        score={{ black: 24, white: 40 }}
        winner={2}
        config={{ mode: "ai", difficulty: "normal", playerColor: 1 }}
        onRematch={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("Computer wins")).not.toBeNull();
  });

  it("calls onRematch when Rematch is clicked", () => {
    const onRematch = vi.fn();
    render(() => (
      <ResultOverlay
        score={{ black: 40, white: 24 }}
        winner={1}
        config={pvpConfig}
        onRematch={onRematch}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.click(screen.getByText("Rematch"));

    expect(onRematch).toHaveBeenCalledOnce();
  });

  it("calls onQuitToTitle when Back to Title is clicked", () => {
    const onQuitToTitle = vi.fn();
    render(() => (
      <ResultOverlay
        score={{ black: 40, white: 24 }}
        winner={1}
        config={pvpConfig}
        onRematch={() => {}}
        onQuitToTitle={onQuitToTitle}
      />
    ));

    fireEvent.click(screen.getByText("Back to Title"));

    expect(onQuitToTitle).toHaveBeenCalledOnce();
  });

  it("does not call onRematch or onQuitToTitle when Escape is pressed", () => {
    const onRematch = vi.fn();
    const onQuitToTitle = vi.fn();
    render(() => (
      <ResultOverlay
        score={{ black: 40, white: 24 }}
        winner={1}
        config={pvpConfig}
        onRematch={onRematch}
        onQuitToTitle={onQuitToTitle}
      />
    ));

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(onRematch).not.toHaveBeenCalled();
    expect(onQuitToTitle).not.toHaveBeenCalled();
    expect(screen.getByText("Black wins")).not.toBeNull();
  });
});
