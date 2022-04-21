import { ipcRenderer as ipc } from "electron";

let isFocusMode = false;

ipc.on("enterFocusMode", () => {
  isFocusMode = true;
  document.body.classList.add("is-focus-mode");

  setTimeout(() => {
    // wait to show the message until the tabs have been hidden, to make the message less confusing
    ipc.invoke("showFocusModeDialog1");
  }, 16);
});

ipc.on("exitFocusMode", () => {
  isFocusMode = false;
  document.body.classList.remove("is-focus-mode");
});

export function isEnabled() {
  return isFocusMode;
}

export function focusModeWarn() {
  ipc.invoke("showFocusModeDialog2");
}
