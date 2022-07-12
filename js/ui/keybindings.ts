import { ipcRenderer as ipc } from "electron";

import webviews from "./webviewUtils";
import * as browserUI from "./browserUI";

import {
  createNewTab,
  currentTab,
  currentTabIndex,
  duplicateTab,
  getTab,
  getTabAtIndex,
  getTabFromHistory,
  setEditorHidden,
  setEditorVisible,
  showHistory,
  tabCount,
} from "./store";

import Mousetrap from "mousetrap";
import * as keyMapModule from "../util/keyMap";
import settings from "../util/settings/settings";

/*
There are three possible ways that keybindings can be handled.
Shortcuts that appear in the menubar are registered in main.js, and send IPC messages to the window (which are handled by menuRenderer.js)
- If the browser UI is focused, shortcuts are handled by Mousetrap.
- If a BrowserView is focused, shortcuts are handled by the before-input-event listener.
*/

const keyMap = keyMapModule.userKeyMap(settings.get("keyMap"));

interface Shortcut {
  combo: string;
  keys: string[];
  fn: (e: any, combo: string) => void;
  keyUp: any;
}

const shortcutsList: Shortcut[] = [];
const registeredMousetrapBindings = {};

/*
  Determines whether a shortcut can actually run
  single-letter shortcuts and shortcuts used for text editing can't run when an input is focused
  */
function checkShortcutCanRun(combo, cb) {
  if (
    /^(shift)?\+?\w$/.test(combo) ||
    combo === "mod+left" ||
    combo === "mod+right"
  ) {
    webviews.callAsync(currentTab()?.id, "isFocused", (err, isFocused) => {
      if (err || !currentTab()?.url || !isFocused) {
        // check whether an input is focused in the browser UI
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          cb(false);
        } else {
          cb(true);
        }
      } else {
        // check whether an input is focused in the webview
        webviews.callAsync(
          currentTab()?.id,
          "executeJavaScript",
          `
            document.activeElement.tagName === "INPUT"
            || document.activeElement.tagName === "TEXTAREA"
            || document.activeElement.tagName === "IFRAME"
            || (function () {
              var n = document.activeElement;
              while (n) {
                if (n.getAttribute && n.getAttribute("contenteditable")) {
                  return true;
                }
                n = n.parentElement;
              }
              return false;
            })()
        `,
          (err, isInputFocused) => {
            if (err) {
              console.warn(err);
              return;
            }
            cb(isInputFocused === false);
          }
        );
      }
    });
  } else {
    cb(true);
  }
}

export function defineShortcut(keysOrKeyMapName, fn, options: any = {}) {
  let binding: any[];

  if (keysOrKeyMapName.keys) {
    binding = keysOrKeyMapName.keys;
  } else {
    binding = keyMap[keysOrKeyMapName];
  }

  if (typeof binding === "string") {
    binding = [binding];
  }

  const shortcutCallback = (e, combo) => {
    // Disable shortcuts for modal mode, unless this is the combo to close the modal
    // if (modalMode.enabled() && combo !== "esc") {
    //   return;
    // }

    checkShortcutCanRun(combo, (canRun) => {
      if (canRun) {
        fn(e, combo);
      }
    });
  };

  binding.forEach((keys) => {
    shortcutsList.push({
      combo: keys,
      keys: keys.split("+"),
      fn: shortcutCallback,
      keyUp: options.keyUp || false,
    });
    if (!registeredMousetrapBindings[keys + (options.keyUp ? "-keyup" : "")]) {
      // mousetrap only allows one listener for each key combination (+keyup variant)
      // so register a single listener, and have it call all the other listeners that we have
      Mousetrap.bind(
        keys,
        (e, combo) => {
          shortcutsList.forEach((shortcut) => {
            if (
              shortcut.combo === combo &&
              (e.type === "keyup") === shortcut.keyUp
            ) {
              shortcut.fn(e, combo);
            }
          });
        },
        options.keyUp ? "keyup" : null
      );
      registeredMousetrapBindings[keys + (options.keyUp ? "-keyup" : "")] =
        true;
    }
  });
}

(() => {
  webviews.bindEvent("before-input-event", (tabId, input) => {
    let expectedKeys = 1;
    // account for additional keys that aren't in the input.key property
    if (input.alt && input.key !== "Alt") {
      expectedKeys++;
    }
    if (input.shift && input.key !== "Shift") {
      expectedKeys++;
    }
    if (input.control && input.key !== "Control") {
      expectedKeys++;
    }
    if (input.meta && input.key !== "Meta") {
      expectedKeys++;
    }

    shortcutsList.forEach((shortcut) => {
      if (
        (shortcut.keyUp && input.type !== "keyUp") ||
        (!shortcut.keyUp && input.type !== "keyDown")
      ) {
        return;
      }
      let matches = true;
      let matchedKeys = 0;
      shortcut.keys.forEach((key) => {
        if (
          !(
            key === input.key.toLowerCase() ||
            key === input.code.replace("Digit", "") ||
            (key === "esc" && input.key === "Escape") ||
            (key === "left" && input.key === "ArrowLeft") ||
            (key === "right" && input.key === "ArrowRight") ||
            (key === "up" && input.key === "ArrowUp") ||
            (key === "down" && input.key === "ArrowDown") ||
            (key === "alt" && (input.alt || input.key === "Alt")) ||
            (key === "option" && (input.alt || input.key === "Alt")) ||
            (key === "shift" && (input.shift || input.key === "Shift")) ||
            (key === "ctrl" && (input.control || input.key === "Control")) ||
            (key === "mod" && (input.meta || input.key === "Meta"))
          )
        ) {
          matches = false;
        } else {
          matchedKeys++;
        }
      });

      if (matches && matchedKeys === expectedKeys) {
        shortcut.fn(null, shortcut.combo);
      }
    });
  });
})();

(() => {
  defineShortcut("quitMin", () => {
    ipc.send("quit");
  });

  defineShortcut("addTab", () => {
    browserUI.addTab(createNewTab(), { enterEditMode: true });
  });

  defineShortcut("addPrivateTab", () => {
    browserUI.addTab(
      createNewTab({
        private: true,
      })
    );
  });

  defineShortcut("duplicateTab", () => {
    const newTab = duplicateTab(currentTab()?.id);
    browserUI.addTab(newTab, { enterEditMode: false });
  });

  defineShortcut("enterEditMode", (e) => {
    setEditorVisible();
  });

  defineShortcut("runShortcut", (e) => {
    // showTabEditor(currentTab()?.id, "!"); TODO: add shortcuts
    // tabEditor.show(tasks.tabs.getSelected(), "!");
  });

  defineShortcut("closeTab", (e) => {
    browserUI.closeTab(currentTab()?.id);
  });

  // keybindings.defineShortcut("moveTabLeft", (e) => {
  //   browserUI.moveTabLeft(tasks.tabs.getSelected());
  // });

  // keybindings.defineShortcut("moveTabRight", (e) => {
  //   browserUI.moveTabRight(tasks.tabs.getSelected());
  // });

  defineShortcut("restoreTab", (e) => {
    const tab = getTabFromHistory();

    if (tab) {
      browserUI.addTab(createNewTab(tab));
    }
  });

  // keybindings.defineShortcut("addToFavorites", (e) => {
  //   tabEditor.show(tasks.tabs.getSelected(), null, false); // we need to show the bookmarks button, which is only visible in edit mode
  //   (
  //     tabEditor.container.querySelector(
  //       ".bookmarks-button"
  //     ) as HTMLButtonElement
  //   ).click();
  // });

  // keybindings.defineShortcut("showBookmarks", () => {
  //   tabEditor.show(tasks.tabs.getSelected(), "!bookmarks ");
  // });

  // cmd+x should switch to tab x. Cmd+9 should switch to the last tab

  for (let i = 1; i < 9; i++) {
    ((i) => {
      defineShortcut({ keys: "mod+" + i }, (e) => {
        const currentIndex = currentTabIndex();
        const newTab =
          getTabAtIndex(currentIndex + i) || getTabAtIndex(currentIndex - i);
        if (newTab) {
          browserUI.switchToTab(newTab.id);
        }
      });

      defineShortcut({ keys: "shift+mod+" + i }, (e) => {
        // const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
        const currentIndex = currentTabIndex();
        const newTab =
          getTabAtIndex(currentIndex - i) || getTabAtIndex(currentIndex + i);
        if (newTab) {
          browserUI.switchToTab(newTab.id);
        }
      });
    })(i);
  }

  defineShortcut("gotoLastTab", (e) => {
    browserUI.switchToTab(getTabAtIndex(tabCount() - 1).id);
  });

  defineShortcut("gotoFirstTab", (e) => {
    browserUI.switchToTab(getTabAtIndex(0).id);
  });

  defineShortcut({ keys: "esc" }, (e) => {
    if (
      webviews.placeholderRequests.length === 0 &&
      document.activeElement?.tagName !== "INPUT"
    ) {
      webviews.callAsync(currentTab()?.id, "stop");
    }

    setEditorHidden();
    // tabEditor.hide();

    // if (modalMode.enabled() && modalMode.onDismiss) {
    //   modalMode.onDismiss();
    //   modalMode.onDismiss = null;
    // }

    // exit full screen mode
    webviews.callAsync(
      currentTab()?.id,
      "executeJavaScript",
      "if(document.webkitIsFullScreen){document.webkitExitFullscreen()}"
    );

    webviews.callAsync(currentTab()?.id, "focus");
  });

  defineShortcut("goBack", (d) => {
    webviews.callAsync(currentTab()?.id, "goBack");
  });

  defineShortcut("goForward", (d) => {
    webviews.callAsync(currentTab()?.id, "goForward");
  });

  defineShortcut("switchToPreviousTab", (d) => {
    // const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
    const previousTab = getTabAtIndex(currentTabIndex() - 1);

    if (previousTab) {
      browserUI.switchToTab(previousTab.id);
    } else {
      browserUI.switchToTab(getTabAtIndex(tabCount() - 1).id);
    }
  });

  defineShortcut("switchToNextTab", (d) => {
    // const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
    const nextTab = getTabAtIndex(currentTabIndex() + 1);

    if (nextTab) {
      browserUI.switchToTab(nextTab.id);
    } else {
      browserUI.switchToTab(getTabAtIndex(0).id);
    }
  });

  // keybindings.defineShortcut("switchToNextTask", (d) => {
  //   if (focusMode.isEnabled()) {
  //     focusMode.focusModeWarn();
  //     return;
  //   }

  //   const taskSwitchList = tasks.tasks.filter((t) => !tasks.isCollapsed(t.id));

  //   const currentTaskIdx = taskSwitchList.findIndex(
  //     (t) => t.id === tasks.getSelected()!.id
  //   );

  //   const nextTask = taskSwitchList[currentTaskIdx + 1] || taskSwitchList[0];
  //   browserUI.switchToTask(nextTask.id);
  // });

  // keybindings.defineShortcut("switchToPreviousTask", (d) => {
  //   if (focusMode.isEnabled()) {
  //     focusMode.focusModeWarn();
  //     return;
  //   }

  //   const taskSwitchList = tasks.tasks.filter((t) => !tasks.isCollapsed(t.id));

  //   const currentTaskIdx = taskSwitchList.findIndex(
  //     (t) => t.id === tasks.getSelected()!.id
  //   );

  //   const taskCount = taskSwitchList.length;

  //   const previousTask =
  //     taskSwitchList[currentTaskIdx - 1] || taskSwitchList[taskCount - 1];
  //   browserUI.switchToTask(previousTask.id);
  // });

  // shift+option+cmd+x should switch to task x

  // for (let i = 1; i < 10; i++) {
  //   keybindings.defineShortcut({ keys: "shift+option+mod+" + i }, (e) => {
  //     if (focusMode.isEnabled()) {
  //       focusMode.focusModeWarn();
  //       return;
  //     }

  //     const taskSwitchList = tasks.filter((t) => !tasks.isCollapsed(t.id));
  //     if (taskSwitchList[i - 1]) {
  //       browserUI.switchToTask(taskSwitchList[i - 1].id);
  //     }
  //   });
  // }

  defineShortcut("closeAllTabs", (d) => {
    // destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.
    // if (focusMode.isEnabled()) {
    //   focusMode.focusModeWarn();
    //   return;
    // }

    const tabs = getTab();
    for (var i = 0; i < tabs.length; i++) {
      browserUI.destroyTab(tabs[i].id);
    }

    browserUI.addTab(); // create a new, blank tab
  });

  let lastReload = 0;

  defineShortcut("reload", () => {
    const time = Date.now();

    // pressing mod+r twice in a row reloads the whole browser
    if (time - lastReload < 500) {
      ipc.send("destroyAllViews");
      ipc.invoke("reloadWindow");
    } else if (currentTab().url.startsWith(webviews.internalPages.error)) {
      // reload the original page rather than show the error page again
      webviews.update(
        currentTab()?.id,
        new URL(currentTab().url).searchParams.get("url")
      );
    } else {
      // this can't be an error page, use the normal reload method
      webviews.callAsync(currentTab()?.id, "reload");
    }

    lastReload = time;
  });

  defineShortcut("reloadIgnoringCache", () => {
    webviews.callAsync(currentTab()?.id, "reloadIgnoringCache");
  });

  defineShortcut("showHistory", () => {
    showHistory();
  });
})();
