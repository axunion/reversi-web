import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import InGameMenu from "./InGameMenu";

afterEach(cleanup);

describe("InGameMenu", () => {
  it("renders no dialog content when closed", () => {
    render(() => (
      <InGameMenu
        open={false}
        onResume={() => {}}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.queryByText("Menu")).toBeNull();
  });

  it("renders the dialog content when open", () => {
    render(() => (
      <InGameMenu
        open={true}
        onResume={() => {}}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    expect(screen.getByText("Menu")).not.toBeNull();
  });

  it("calls onResume when Resume is clicked", () => {
    const onResume = vi.fn();
    render(() => (
      <InGameMenu
        open={true}
        onResume={onResume}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.click(screen.getByText("Resume"));

    expect(onResume).toHaveBeenCalledOnce();
  });

  it("calls onRestart when Restart is clicked", () => {
    const onRestart = vi.fn();
    render(() => (
      <InGameMenu
        open={true}
        onResume={() => {}}
        onRestart={onRestart}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.click(screen.getByText("Restart"));

    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("calls onQuitToTitle when Quit to Title is clicked", () => {
    const onQuitToTitle = vi.fn();
    render(() => (
      <InGameMenu
        open={true}
        onResume={() => {}}
        onRestart={() => {}}
        onQuitToTitle={onQuitToTitle}
      />
    ));

    fireEvent.click(screen.getByText("Quit to Title"));

    expect(onQuitToTitle).toHaveBeenCalledOnce();
  });

  it("calls onResume when Escape is pressed", () => {
    const onResume = vi.fn();
    render(() => (
      <InGameMenu
        open={true}
        onResume={onResume}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(onResume).toHaveBeenCalledOnce();
  });
});
