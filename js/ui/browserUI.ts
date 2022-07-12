/* common actions that affect different parts of the UI (webviews, tabstrip, etc) */
import { ipcRenderer as ipc } from "electron";
import settings from "./settings/settings";
import webviews from "./webviewUtils";
import { searchBarEvent } from "./searchbar";
import type { TabOptions } from "./store";
import {
  currentTab,
  createNewTab,
  deleteTab,
  tabEvent,
  getTab,
  stateView,
  currentTabIndex,
  getTabAtIndex,
  updateTab,
  selectTab,
  setEditorVisible,
  setEditorHidden,
} from "./store";

export function addTab(newTab = createNewTab(), options: TabOptions = {}) {
  /*
  adding a new tab should destroy the current one if either:
  * The current tab is an empty, non-private tab, and the new tab is private
  * The current tab is empty, and the new tab has a URL
  */
  const selectedTad = currentTab();
  const isEmpty = selectedTad.url === "";
  const isNonPrivate = !selectedTad.private;

  if (
    isEmpty &&
    !options.openInBackground &&
    ((isNonPrivate && newTab.private) || newTab.url)
  ) {
    destroyTab(selectedTad?.id);
  }

  webviews.add(newTab);

  if (!options.openInBackground) {
    switchToTab(newTab.id, options);

    process.nextTick(() => {
      selectTab(newTab.id, options);
      if (options.enterEditMode) {
        setEditorVisible();
      }
    });
  }
}

// export function moveTabLeft(tabId = tasks.tabs.getSelected()) {
//   tasks.tabs.moveBy(tabId!, -1);
//   tabBar.updateAll();
// }

// export function moveTabRight(tabId = tasks.tabs.getSelected()) {
//   tasks.tabs.moveBy(tabId!, 1);
//   tabBar.updateAll();
// }

/* destroys the webview and tab element for a tab */
export function destroyTab(id: string) {
  deleteTab(id);
  webviews.destroy(id); // remove the webview
}

/* destroys a tab, and either switches to the next tab or creates a new one */

export function closeTab(tabId: string) {
  if (tabId === currentTab().id) {
    const currentIndex = currentTabIndex();
    const nextTab =
      getTabAtIndex(currentIndex - 1) || getTabAtIndex(currentIndex + 1);

    destroyTab(tabId);

    if (nextTab) {
      selectTab(nextTab.id);
    } else {
      addTab();
    }
  } else {
    destroyTab(tabId);
  }
}

/* switches to a tab - update the webview, state, tabstrip, etc. */

export function switchToTab(tabId: string, options: TabOptions = {}) {
  if (!options.enterEditMode) {
    setEditorHidden();
  }

  webviews.setSelected(tabId, {
    focus: !options.enterEditMode,
  });

  if (!getTab(tabId).url) {
    document.body.classList.add("is-ntp");
  } else {
    document.body.classList.remove("is-ntp");
  }
}

tabEvent.on("tab-updated", (id, key) => {
  if (key === "url" && id === currentTab().id) {
    document.body.classList.remove("is-ntp");
  }
});

tabEvent.on("tab-selected", (id, opt) => {
  switchToTab(id, opt);
});

tabEvent.on("tab-closed", (id) => {
  closeTab(id);
});

webviews.bindIPC("close-window", (tabId, args) => {
  closeTab(tabId);
});

webviews.bindEvent(
  "did-create-popup",
  (tabId: string, popupId: string, initialURL: string) => {
    const popupTab = createNewTab({
      // in most cases, initialURL will be overwritten once the popup loads, but if the URL is a downloaded file, it will remain the same
      url: initialURL,
      private: getTab(tabId).private,
    });
    webviews.add(popupTab, popupId);
    switchToTab(popupTab.id);
  }
);

webviews.bindEvent(
  "new-tab",
  (tabId: string, url: string, openInForeground: boolean) => {
    const newTab = createNewTab({
      url: url,
      private: getTab(tabId).private, // inherit private status from the current tab
    });

    addTab(newTab, {
      enterEditMode: false,
      openInBackground:
        !settings.get("openTabsInForeground") && !openInForeground,
    });
  }
);

ipc.on("set-file-view", (e, data) => {
  stateView.tabs.forEach((tab) => {
    if (tab.url === data.url) {
      updateTab(tab.id, { isFileView: data.isFileView });
    }
  });
});

searchBarEvent.on("url-selected", (data) => {
  if (data.background) {
    const newTab = createNewTab({
      url: data.url,
      private: getTab(currentTab().id).private,
    });
    addTab(newTab, {
      enterEditMode: false,
      openInBackground: true,
    });
  } else {
    webviews.update(currentTab()?.id, data.url);
    webviews.focus();
    setEditorHidden();
  }
});
