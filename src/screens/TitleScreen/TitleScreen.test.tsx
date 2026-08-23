import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import TitleScreen from "./TitleScreen";

afterEach(cleanup);

describe("TitleScreen", () => {
  it("defaults to vs Player when AI is unavailable", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={false} aiProbed={true} />
    ));

    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({ mode: "pvp" });
  });

  it("defaults to vs AI once available, with default difficulty (normal) and color (black)", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={true} aiProbed={true} />
    ));

    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "ai",
      difficulty: "normal",
      playerColor: 1,
    });
  });

  it("does not start a game when vs Player is clicked", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={true} aiProbed={true} />
    ));

    fireEvent.click(screen.getByText("vs Player"));

    expect(onStart).not.toHaveBeenCalled();
  });

  it("passes the selected difficulty and color to onStart", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={true} aiProbed={true} />
    ));

    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("White"));
    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "ai",
      difficulty: "hard",
      playerColor: 2,
    });
  });

  it("starts a pvp game after switching away from the default vs AI selection", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={true} aiProbed={true} />
    ));

    fireEvent.click(screen.getByText("vs Player"));
    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({ mode: "pvp" });
  });

  it("disables vs AI and shows a note when AI is unavailable", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={false} aiProbed={true} />
    ));

    const radio = screen.getByRole("radio", {
      name: "vs AI",
    }) as HTMLInputElement;

    expect(radio.disabled).toBe(true);
    expect(
      screen
        .getByText("Computer opponent unavailable")
        .hasAttribute("data-hidden"),
    ).toBe(false);

    fireEvent.click(screen.getByText("vs AI"));
    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({ mode: "pvp" });
  });

  it("keeps the AI options panel inert while vs Player is selected", () => {
    const onStart = vi.fn();
    render(() => (
      <TitleScreen onStart={onStart} aiAvailable={true} aiProbed={true} />
    ));

    fireEvent.click(screen.getByText("vs Player"));

    const hardRadio = screen.getByRole("radio", {
      name: "Hard",
    }) as HTMLInputElement;
    expect(hardRadio.disabled).toBe(true);

    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("vs AI"));
    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "ai",
      difficulty: "normal",
      playerColor: 1,
    });
  });

  it("switches the default to vs AI once availability resolves, unless the player already chose", async () => {
    const onStart = vi.fn();
    const [aiAvailable, setAiAvailable] = createSignal(false);
    const [aiProbed, setAiProbed] = createSignal(false);
    render(() => (
      <TitleScreen
        onStart={onStart}
        aiAvailable={aiAvailable()}
        aiProbed={aiProbed()}
      />
    ));

    setAiAvailable(true);
    setAiProbed(true);
    await Promise.resolve();

    fireEvent.click(screen.getByText("Start Game"));

    expect(onStart).toHaveBeenCalledWith({
      mode: "ai",
      difficulty: "normal",
      playerColor: 1,
    });
  });

  it("has no step navigation", () => {
    render(() => (
      <TitleScreen onStart={() => {}} aiAvailable={true} aiProbed={true} />
    ));

    expect(screen.queryByText("Back")).toBeNull();
  });

  it("offers every difficulty rung, in ladder order", () => {
    render(() => (
      <TitleScreen onStart={() => {}} aiAvailable={true} aiProbed={true} />
    ));

    const values = [
      ...document.querySelectorAll<HTMLInputElement>(
        'input[name="difficulty"]',
      ),
    ].map((input) => input.value);

    expect(values).toEqual(["easy", "casual", "normal", "hard", "expert"]);
  });
});
