import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
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

  it("calls onResume when Close is clicked", () => {
    const onResume = vi.fn();
    render(() => (
      <InGameMenu
        open={true}
        onResume={onResume}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onResume).toHaveBeenCalledOnce();
  });

  it("hides the Close button while a confirm view is showing, and shows it again after Cancel", async () => {
    render(() => (
      <InGameMenu
        open={true}
        onResume={() => {}}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.click(screen.getByText("Restart"));

    // The Close button belongs only to MenuView, so it's gone as soon as
    // ConfirmView has actually swapped in (it's still present during
    // MenuView's own ~150ms leaving animation, so this check only makes
    // sense post-swap).
    expect(await screen.findByText("Restart game?")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();

    fireEvent.click(screen.getByText("Cancel"));

    expect(await screen.findByText("Menu")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).not.toBeNull();
  });

  it("shows a confirm step and calls onRestart only after confirming", async () => {
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

    expect(onRestart).not.toHaveBeenCalled();
    expect(await screen.findByText("Restart game?")).not.toBeNull();
    expect(screen.getByText("Current progress will be lost.")).not.toBeNull();

    // Confirming goes through `confirm()`, which deliberately doesn't reset
    // the view — the confirm view rides along with the dialog's own close
    // animation instead of flashing back to "Menu" mid-close.
    fireEvent.click(screen.getByText("Restart"));

    expect(onRestart).toHaveBeenCalledOnce();
    expect(screen.getByText("Restart game?")).not.toBeNull();
  });

  it("shows a confirm step and calls onQuitToTitle only after confirming", async () => {
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

    expect(onQuitToTitle).not.toHaveBeenCalled();
    expect(await screen.findByText("Quit to title?")).not.toBeNull();
    expect(screen.getByText("Current progress will be lost.")).not.toBeNull();

    fireEvent.click(screen.getByText("Quit to Title"));

    expect(onQuitToTitle).toHaveBeenCalledOnce();
    expect(screen.getByText("Quit to title?")).not.toBeNull();
  });

  it("returns to the main menu without calling the prop when Cancel is clicked", async () => {
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
    expect(await screen.findByText("Restart game?")).not.toBeNull();

    fireEvent.click(screen.getByText("Cancel"));

    expect(onRestart).not.toHaveBeenCalled();
    expect(await screen.findByText("Menu")).not.toBeNull();
    expect(screen.queryByText("Restart game?")).toBeNull();
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

  it("resets to the main menu when reopened after Escape-closing mid-confirm", async () => {
    const onResume = vi.fn();
    const [open, setOpen] = createSignal(true);

    render(() => (
      <InGameMenu
        open={open()}
        onResume={onResume}
        onRestart={() => {}}
        onQuitToTitle={() => {}}
      />
    ));

    fireEvent.click(screen.getByText("Restart"));
    expect(await screen.findByText("Restart game?")).not.toBeNull();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onResume).toHaveBeenCalledOnce();

    setOpen(false);
    setOpen(true);

    expect(screen.getByText("Menu")).not.toBeNull();
    expect(screen.queryByText("Restart game?")).toBeNull();
  });
});
