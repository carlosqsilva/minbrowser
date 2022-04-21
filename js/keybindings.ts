// @ts-check

/*
There are three possible ways that keybindings can be handled.
 Shortcuts that appear in the menubar are registered in main.js, and send IPC messages to the window (which are handled by menuRenderer.js)
 - If the browser UI is focused, shortcuts are handled by Mousetrap.
  - If a BrowserView is focused, shortcuts are handled by the before-input-event listener.
  */

import Mousetrap from "mousetrap";
import * as keyMapModule from "./util/keyMap"

import webviews from "./webviews";
import settings from "./util/settings/settings";
import modalMode from "./modalMode";

import { tasks } from "./tabState";

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
    webviews.callAsync(
      tasks.tabs.getSelected(),
      "isFocused",
      (err, isFocused) => {
        if (
          err ||
          !tasks.tabs.get(tasks.tabs.getSelected()).url ||
          !isFocused
        ) {
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
            tasks.tabs.getSelected(),
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
      }
    );
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
    if (modalMode.enabled() && combo !== "esc") {
      return;
    }

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
