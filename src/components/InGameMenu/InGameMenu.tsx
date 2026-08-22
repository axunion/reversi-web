import { Dialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { batch, createEffect, createSignal, onMount, Show } from "solid-js";
import styles from "./InGameMenu.module.css";

type InGameMenuProps = {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
};

type ConfirmTarget = "restart" | "quit";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Must match .view[data-phase="leaving"]'s animation-duration in InGameMenu.module.css —
// the old view is only swapped out once its shrink-and-fade has actually played.
const LEAVE_DURATION_MS = prefersReducedMotion ? 0 : 150;

function MenuView(props: {
  leaving: boolean;
  onRestart: () => void;
  onQuit: () => void;
}) {
  let ref: HTMLDivElement | undefined;
  onMount(() => ref?.focus());

  return (
    <div
      ref={ref}
      tabIndex={-1}
      class={styles.view}
      data-phase={props.leaving ? "leaving" : undefined}
    >
      <Dialog.Title class={styles.title}>Menu</Dialog.Title>
      <button type="button" class={styles.button} onClick={props.onRestart}>
        Restart
      </button>
      <button type="button" class={styles.button} onClick={props.onQuit}>
        Quit to Title
      </button>
    </div>
  );
}

function ConfirmView(props: {
  target: ConfirmTarget;
  leaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  let ref: HTMLDivElement | undefined;
  onMount(() => ref?.focus());

  return (
    <div
      ref={ref}
      tabIndex={-1}
      class={styles.view}
      data-phase={props.leaving ? "leaving" : undefined}
    >
      <Dialog.Title class={styles.title}>
        {props.target === "restart" ? "Restart game?" : "Quit to title?"}
      </Dialog.Title>
      <p class={styles.confirmText}>Current progress will be lost.</p>
      <button type="button" class={styles.button} onClick={props.onConfirm}>
        {props.target === "restart" ? "Restart" : "Quit to Title"}
      </button>
      <button type="button" class={styles.button} onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
}

function InGameMenu(props: InGameMenuProps) {
  const [confirming, setConfirming] = createSignal<ConfirmTarget | null>(null);
  const [leaving, setLeaving] = createSignal(false);
  let pendingSwap: ReturnType<typeof setTimeout> | undefined;

  // Always land back on the main menu the next time the dialog opens,
  // regardless of how it was last closed (Escape, overlay-click, or a
  // confirmed Restart/Quit) — this also means neither `confirm()` nor the
  // dismiss path below need to touch `confirming` themselves, so whichever
  // view was showing simply rides along with the dialog's own close
  // animation instead of instantly swapping back to "Menu" mid-close.
  createEffect(() => {
    clearTimeout(pendingSwap);
    if (props.open) {
      setLeaving(false);
      setConfirming(null);
    }
  });

  function navigate(next: ConfirmTarget | null) {
    clearTimeout(pendingSwap);
    setLeaving(true);
    pendingSwap = setTimeout(() => {
      batch(() => {
        setLeaving(false);
        setConfirming(next);
      });
    }, LEAVE_DURATION_MS);
  }

  function confirm(target: ConfirmTarget) {
    clearTimeout(pendingSwap);
    if (target === "restart") props.onRestart();
    else props.onQuitToTitle();
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          clearTimeout(pendingSwap);
          props.onResume();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <Dialog.Content class={styles.content}>
          <div class={styles.viewport}>
            {/* Rendered outside `.view`: an ancestor's CSS `transform`
                becomes the containing block for absolutely positioned
                descendants, so nesting this inside the scaling `.view`
                made it visibly balloon from that view's center. */}
            <Show when={!confirming()}>
              <Dialog.CloseButton class={styles.close} aria-label="Close">
                <X size={20} />
              </Dialog.CloseButton>
            </Show>
            <Show
              when={confirming()}
              fallback={
                <MenuView
                  leaving={leaving()}
                  onRestart={() => navigate("restart")}
                  onQuit={() => navigate("quit")}
                />
              }
            >
              {(target) => (
                <ConfirmView
                  target={target()}
                  leaving={leaving()}
                  onConfirm={() => confirm(target())}
                  onCancel={() => navigate(null)}
                />
              )}
            </Show>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export default InGameMenu;
