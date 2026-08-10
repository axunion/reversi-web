import { Dialog } from "@kobalte/core/dialog";
import styles from "./InGameMenu.module.css";

type InGameMenuProps = {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
};

function InGameMenu(props: InGameMenuProps) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onResume();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <Dialog.Content class={styles.content}>
          <Dialog.Title class={styles.title}>Menu</Dialog.Title>
          <button type="button" class={styles.button} onClick={props.onResume}>
            Resume
          </button>
          <button type="button" class={styles.button} onClick={props.onRestart}>
            Restart
          </button>
          <button
            type="button"
            class={styles.button}
            onClick={props.onQuitToTitle}
          >
            Quit to Title
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export default InGameMenu;
