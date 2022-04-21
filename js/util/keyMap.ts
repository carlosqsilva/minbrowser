export const defaultKeyMap = {
  quitMin: "mod+q",
  addTab: "mod+t",
  addPrivateTab: "shift+mod+n",
  duplicateTab: "shift+mod+d",
  addTask: "mod+n",
  toggleTasks: "shift+mod+e",
  goBack: "mod+left",
  goForward: "mod+right",
  enterEditMode: ["mod+l", "mod+k"],
  runShortcut: "mod+e",
  completeSearchbar: "mod+enter",
  closeTab: "mod+w",
  restoreTab: "shift+mod+t",
  gotoFirstTab: "shift+mod+9",
  gotoLastTab: "mod+9",
  addToFavorites: "mod+d",
  showBookmarks: "shift+mod+b",
  toggleReaderView: "shift+mod+r",
  switchToNextTab: ["option+mod+right", "mod+tab"],
  switchToPreviousTab: [
    "option+mod+left",
    "shift+mod+tab",
  ],
  moveTabLeft: "option+mod+shift+left",
  moveTabRight: "option+mod+shift+right",
  switchToNextTask: "mod+]",
  switchToPreviousTask: "mod+[",
  closeAllTabs: "shift+mod+w",
  reload: ["mod+r", "f5"],
  reloadIgnoringCache: "mod+f5",
  showMenu: "ctrl+m",
  followLink: "mod+enter",
  fillPassword: "mod+\\",
  toggleTabAudio: "shift+mod+m",
  showHistory: "shift+mod+h",
};

export type KeyMapObj = typeof defaultKeyMap

/* Utility function to override default mapping with user settings */
export function userKeyMap(settings: Partial<KeyMapObj>) {
  const keyMapCopy = Object.assign({}, defaultKeyMap);
  if (settings) {
    // override the default keymap by the user defined ones
    for (const key in keyMapCopy) {
      if (settings[key]) {
        keyMapCopy[key] = settings[key];
      }
    }
  }

  return keyMapCopy;
}
