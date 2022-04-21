import { ipcRenderer as ipc } from "electron";

import webviews from "./webviews";
import * as keybindings from "./keybindings";
import * as browserUI from "./browserUI";
import tabEditor from "./navbar/tabEditor";

import { tasks } from "./tabState";
import * as focusMode from "./focusMode";
import modalMode from "./modalMode";

(function initialize() {
  keybindings.defineShortcut("quitMin", () => {
    ipc.send("quit");
  });

  keybindings.defineShortcut("addTab", () => {
    /* new tabs can't be created in modal mode */
    if (modalMode.enabled()) {
      return;
    }

    /* new tabs can't be created in focus mode */
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    browserUI.addTab();
  });

  keybindings.defineShortcut("addPrivateTab", () => {
    /* new tabs can't be created in modal mode */
    if (modalMode.enabled()) {
      return;
    }

    /* new tabs can't be created in focus mode */
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    browserUI.addTab(
      tasks.tabs.add({
        private: true,
      })
    );
  });

  keybindings.defineShortcut("duplicateTab", () => {
    if (modalMode.enabled()) {
      return;
    }

    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    const sourceTab = tasks.tabs.get(tasks.tabs.getSelected());
    // strip tab id so that a new one is generated
    const newTab = tasks.tabs.add({ ...sourceTab, id: undefined });

    browserUI.addTab(newTab, { enterEditMode: false });
  });

  keybindings.defineShortcut("enterEditMode", (e) => {
    tabEditor.show(tasks.tabs.getSelected());
    return false;
  });

  keybindings.defineShortcut("runShortcut", (e) => {
    tabEditor.show(tasks.tabs.getSelected(), "!");
  });

  keybindings.defineShortcut("closeTab", (e) => {
    browserUI.closeTab(tasks.tabs.getSelected());
  });

  keybindings.defineShortcut("moveTabLeft", (e) => {
    browserUI.moveTabLeft(tasks.tabs.getSelected());
  });

  keybindings.defineShortcut("moveTabRight", (e) => {
    browserUI.moveTabRight(tasks.tabs.getSelected());
  });

  keybindings.defineShortcut("restoreTab", (e) => {
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    const restoredTab = tasks.getSelected()!.tabHistory.pop();

    // The tab history stack is empty
    if (!restoredTab) {
      return;
    }

    browserUI.addTab(tasks.tabs.add(restoredTab), {
      enterEditMode: false,
    });
  });

  keybindings.defineShortcut("addToFavorites", (e) => {
    tabEditor.show(tasks.tabs.getSelected(), null, false); // we need to show the bookmarks button, which is only visible in edit mode
    (
      tabEditor.container.querySelector(
        ".bookmarks-button"
      ) as HTMLButtonElement
    ).click();
  });

  keybindings.defineShortcut("showBookmarks", () => {
    tabEditor.show(tasks.tabs.getSelected(), "!bookmarks ");
  });

  // cmd+x should switch to tab x. Cmd+9 should switch to the last tab

  for (let i = 1; i < 9; i++) {
    (function (i) {
      keybindings.defineShortcut({ keys: "mod+" + i }, (e) => {
        const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
        var newTab =
          tasks.tabs.getAtIndex(currentIndex + i) ||
          tasks.tabs.getAtIndex(currentIndex - i);
        if (newTab) {
          browserUI.switchToTab(newTab.id);
        }
      });

      keybindings.defineShortcut({ keys: "shift+mod+" + i }, (e) => {
        const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
        var newTab =
          tasks.tabs.getAtIndex(currentIndex - i) ||
          tasks.tabs.getAtIndex(currentIndex + i);
        if (newTab) {
          browserUI.switchToTab(newTab.id);
        }
      });
    })(i);
  }

  keybindings.defineShortcut("gotoLastTab", (e) => {
    browserUI.switchToTab(tasks.tabs.getAtIndex(tasks.tabs.count() - 1).id);
  });

  keybindings.defineShortcut("gotoFirstTab", (e) => {
    browserUI.switchToTab(tasks.tabs.getAtIndex(0).id);
  });

  keybindings.defineShortcut({ keys: "esc" }, (e) => {
    if (
      webviews.placeholderRequests.length === 0 &&
      document.activeElement?.tagName !== "INPUT"
    ) {
      webviews.callAsync(tasks.tabs.getSelected()!, "stop");
    }

    tabEditor.hide();

    if (modalMode.enabled() && modalMode.onDismiss) {
      modalMode.onDismiss();
      modalMode.onDismiss = null;
    }

    // exit full screen mode
    webviews.callAsync(
      tasks.tabs.getSelected()!,
      "executeJavaScript",
      "if(document.webkitIsFullScreen){document.webkitExitFullscreen()}"
    );

    webviews.callAsync(tasks.tabs.getSelected()!, "focus");
  });

  keybindings.defineShortcut("goBack", (d) => {
    webviews.callAsync(tasks.tabs.getSelected()!, "goBack");
  });

  keybindings.defineShortcut("goForward", (d) => {
    webviews.callAsync(tasks.tabs.getSelected()!, "goForward");
  });

  keybindings.defineShortcut("switchToPreviousTab", (d) => {
    const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
    const previousTab = tasks.tabs.getAtIndex(currentIndex - 1);

    if (previousTab) {
      browserUI.switchToTab(previousTab.id);
    } else {
      browserUI.switchToTab(tasks.tabs.getAtIndex(tasks.tabs.count() - 1).id);
    }
  });

  keybindings.defineShortcut("switchToNextTab", (d) => {
    const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
    const nextTab = tasks.tabs.getAtIndex(currentIndex + 1);

    if (nextTab) {
      browserUI.switchToTab(nextTab.id);
    } else {
      browserUI.switchToTab(tasks.tabs.getAtIndex(0).id);
    }
  });

  keybindings.defineShortcut("switchToNextTask", (d) => {
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    const taskSwitchList = tasks.tasks.filter((t) => !tasks.isCollapsed(t.id));

    const currentTaskIdx = taskSwitchList.findIndex(
      (t) => t.id === tasks.getSelected()!.id
    );

    const nextTask = taskSwitchList[currentTaskIdx + 1] || taskSwitchList[0];
    browserUI.switchToTask(nextTask.id);
  });

  keybindings.defineShortcut("switchToPreviousTask", (d) => {
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    const taskSwitchList = tasks.tasks.filter((t) => !tasks.isCollapsed(t.id));

    const currentTaskIdx = taskSwitchList.findIndex(
      (t) => t.id === tasks.getSelected()!.id
    );

    const taskCount = taskSwitchList.length;

    const previousTask =
      taskSwitchList[currentTaskIdx - 1] || taskSwitchList[taskCount - 1];
    browserUI.switchToTask(previousTask.id);
  });

  // shift+option+cmd+x should switch to task x

  for (let i = 1; i < 10; i++) {
    keybindings.defineShortcut({ keys: "shift+option+mod+" + i }, (e) => {
      if (focusMode.isEnabled()) {
        focusMode.focusModeWarn();
        return;
      }

      const taskSwitchList = tasks.filter((t) => !tasks.isCollapsed(t.id));
      if (taskSwitchList[i - 1]) {
        browserUI.switchToTask(taskSwitchList[i - 1].id);
      }
    });
  }

  keybindings.defineShortcut("closeAllTabs", (d) => {
    // destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    const tset = tasks.tabs.get();
    for (var i = 0; i < tset.length; i++) {
      browserUI.destroyTab(tset[i].id);
    }

    browserUI.addTab(); // create a new, blank tab
  });

  var lastReload = 0;

  keybindings.defineShortcut("reload", () => {
    const time = Date.now();

    // pressing mod+r twice in a row reloads the whole browser
    if (time - lastReload < 500) {
      ipc.send("destroyAllViews");
      ipc.invoke("reloadWindow");
    } else if (
      tasks.tabs
        .get(tasks.tabs.getSelected()!)
        .url.startsWith(webviews.internalPages.error)
    ) {
      // reload the original page rather than show the error page again
      webviews.update(
        tasks.tabs.getSelected(),
        new URL(tasks.tabs.get(tasks.tabs.getSelected()!).url).searchParams.get(
          "url"
        )
      );
    } else {
      // this can't be an error page, use the normal reload method
      webviews.callAsync(tasks.tabs.getSelected()!, "reload");
    }

    lastReload = time;
  });

  keybindings.defineShortcut("reloadIgnoringCache", () => {
    webviews.callAsync(tasks.tabs.getSelected()!, "reloadIgnoringCache");
  });

  keybindings.defineShortcut("showHistory", () => {
    tabEditor.show(tasks.tabs.getSelected(), "!history ");
  });
})();
