const overlay = document.getElementById("overlay") as HTMLDivElement;

class ModalMode {
  public isModalMode = false;
  public onDismiss: (() => void) | null = null;
  public enabled() {
    return this.isModalMode;
  }
  public toggle(enabled, listeners?: any) {
    if (enabled && listeners.onDismiss) {
      this.onDismiss = listeners.onDismiss;
    }

    if (!enabled) {
      this.onDismiss = null;
    }

    this.isModalMode = enabled;
    if (enabled) {
      document.body.classList.add("is-modal-mode");
    } else {
      document.body.classList.remove("is-modal-mode");
    }
  }
  constructor() {
    overlay.addEventListener("click", () => {
      if (this.onDismiss) {
        this.onDismiss();
        this.onDismiss = null;
      }
    });
  }
}

export default new ModalMode();
