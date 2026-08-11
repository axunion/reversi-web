import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import TitleScreen from "./TitleScreen";

afterEach(cleanup);

describe("TitleScreen", () => {
  it("calls onStart with pvp config when Two Players is clicked", () => {
    const onStart = vi.fn();
    render(() => <TitleScreen onStart={onStart} aiAvailable={true} />);

    fireEvent.click(screen.getByText("Two Players"));

    expect(onStart).toHaveBeenCalledWith({ mode: "pvp" });
  });

  it("shows the aiSetup step when Versus Computer is clicked and AI is available", () => {
    render(() => <TitleScreen onStart={() => {}} aiAvailable={true} />);

    expect(screen.queryByText("Start Game")).toBeNull();

    fireEvent.click(screen.getByText("Versus Computer"));

    expect(screen.getByText("Start Game")).not.toBeNull();
  });

  it("disables Versus Computer and shows a note when AI is unavailable", () => {
    render(() => <TitleScreen onStart={() => {}} aiAvailable={false} />);

    const button = screen.getByText("Versus Computer") as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(screen.getByText("Computer opponent unavailable")).not.toBeNull();
  });

  it("starts an AI game with default difficulty (normal) and color (black) when Start Game is clicked without changes", () => {
    const onStart = vi.fn();
    render(() => <TitleScreen onStart={onStart} aiAvailable={true} />);

    fireEvent.click(screen.getByText("Versus Computer"));
    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "ai",
      difficulty: "normal",
      playerColor: 1,
    });
  });

  it("passes the selected difficulty and color to onStart", () => {
    const onStart = vi.fn();
    render(() => <TitleScreen onStart={onStart} aiAvailable={true} />);

    fireEvent.click(screen.getByText("Versus Computer"));
    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("White"));
    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "ai",
      difficulty: "hard",
      playerColor: 2,
    });
  });

  it("returns to the main step when Back is clicked", () => {
    render(() => <TitleScreen onStart={() => {}} aiAvailable={true} />);

    fireEvent.click(screen.getByText("Versus Computer"));
    expect(screen.getByText("Start Game")).not.toBeNull();

    fireEvent.click(screen.getByText("Back"));

    expect(screen.queryByText("Start Game")).toBeNull();
    expect(screen.getByText("Two Players")).not.toBeNull();
  });
});
