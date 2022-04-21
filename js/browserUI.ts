// @ts-check

const { ipcRenderer: ipc } = require("electron");

// const statistics = require("./statistics.js");
// const searchEngine = require("./util/searchEngine.js");
// const urlParser = require("./util/urlParser.js");

/* common actions that affect different parts of the UI (webviews, tabstrip, etc) */

import settings from "./util/settings/settings";
import webviews from "./webviews";
import * as focusMode from "./focusMode";
import tabBar from "./navbar/tabBar";
import tabEditor from "./navbar/tabEditor";
import { searchbar } from "./searchbar/searchbar";

import { tasks } from "./tabState";

/* creates a new task */

export function addTask() {
  tasks.setSelected(tasks.add());

  tabBar.updateAll();
  addTab();
}

/* creates a new tab */

interface Options {
  openInBackground?: boolean;
  enterEditMode?: any;
}

/*
options
  options.enterEditMode - whether to enter editing mode when the tab is created. Defaults to true.
  options.openInBackground - whether to open the tab without switching to it. Defaults to false.
*/
export function addTab(tabId = tasks.tabs.add(), options: Options = {}) {
  /*
  adding a new tab should destroy the current one if either:
  * The current tab is an empty, non-private tab, and the new tab is private
  * The current tab is empty, and the new tab has a URL
  */

  const currentTabID = tasks.tabs.getSelected()!;
  const currentTab = tasks.tabs.get(currentTabID);
  const isEmpty = currentTab?.url;
  const isNonPrivate = !currentTab.private;

  if (
    !options.openInBackground &&
    !isEmpty &&
    ((isNonPrivate && tasks.tabs.get(tabId).private) ||
      tasks.tabs.get(tabId).url)
  ) {
    destroyTab(currentTabID);
  }

  tabBar.addTab(tabId);
  webviews.add(tabId);

  if (!options.openInBackground) {
    switchToTab(tabId, {
      focusWebview: options.enterEditMode === false,
    });
    if (options.enterEditMode !== false) {
      tabEditor.show(tabId);
    }
  } else {
    tabBar.getTab(tabId).scrollIntoView();
  }
}

export function moveTabLeft(tabId = tasks.tabs.getSelected()) {
  tasks.tabs.moveBy(tabId!, -1);
  tabBar.updateAll();
}

export function moveTabRight(tabId = tasks.tabs.getSelected()) {
  tasks.tabs.moveBy(tabId!, 1);
  tabBar.updateAll();
}

/* destroys a task object and the associated webviews */

export function destroyTask(id: string) {
  const task = tasks.get(id);

  if (task) {
    task.tabs.forEach((tab) => {
      webviews.destroy(tab.id);
    });
  }

  tasks.destroy(id);
}

/* destroys the webview and tab element for a tab */
export function destroyTab(id: string) {
  tabBar.removeTab(id);
  tasks.tabs.destroy(id); // remove from state - returns the index of the destroyed tab
  webviews.destroy(id); // remove the webview
}

/* destroys a task, and either switches to the next most-recent task or creates a new one */

export function closeTask(taskId) {
  const previousCurrentTask = tasks.getSelected()?.id;

  destroyTask(taskId);

  if (taskId === previousCurrentTask) {
    // the current task was destroyed, find another task to switch to

    if (tasks.getLength() === 0) {
      // there are no tasks left, create a new one
      return addTask();
    } else {
      // switch to the most-recent task

      const recentTaskList = tasks.map((task) => {
        return { id: task.id, lastActivity: tasks.getLastActivity(task.id) };
      });

      const mostRecent = recentTaskList.reduce((latest, current) =>
        current.lastActivity > latest.lastActivity ? current : latest
      );

      return switchToTask(mostRecent.id);
    }
  }
}

/* destroys a tab, and either switches to the next tab or creates a new one */

export function closeTab(tabId: string) {
  /* disabled in focus mode */
  if (focusMode.isEnabled()) {
    focusMode.focusModeWarn();
    return;
  }

  if (tabId === tasks.tabs.getSelected()) {
    const currentIndex = tasks.tabs.getIndex(tasks.tabs.getSelected()!);
    const nextTab =
      tasks.tabs.getAtIndex(currentIndex - 1) ||
      tasks.tabs.getAtIndex(currentIndex + 1);

    destroyTab(tabId);

    if (nextTab) {
      switchToTab(nextTab.id);
    } else {
      addTab();
    }
  } else {
    destroyTab(tabId);
  }
}

/* changes the currently-selected task and updates the UI */

export function switchToTask(id: string) {
  tasks.setSelected(id);

  tabBar.updateAll();

  const taskData = tasks.get(id);

  if (taskData && taskData.tabs.count() > 0) {
    var selectedTab = taskData.tabs.getSelected();

    // if the task has no tab that is selected, switch to the most recent one

    if (!selectedTab) {
      selectedTab = taskData.tabs.get().sort((a, b) => {
        return b.lastActivity - a.lastActivity;
      })[0].id;
    }

    switchToTab(selectedTab);
  } else {
    addTab();
  }
}

/* switches to a tab - update the webview, state, tabstrip, etc. */

export function switchToTab(id, options?: any) {
  options = options || {};

  tabEditor.hide();

  tasks.tabs.setSelected(id);
  tabBar.setActiveTab(id);
  webviews.setSelected(id, {
    focus: options.focusWebview !== false,
  });
  if (!tasks.tabs.get(id).url) {
    document.body.classList.add("is-ntp");
  } else {
    document.body.classList.remove("is-ntp");
  }
}

tasks.on("tab-updated", (id, key) => {
  if (key === "url" && id === tasks.tabs.getSelected()) {
    document.body.classList.remove("is-ntp");
  }
});

webviews.bindEvent("did-create-popup", (tabId, popupId, initialURL) => {
  const popupTab = tasks.tabs.add({
    // in most cases, initialURL will be overwritten once the popup loads, but if the URL is a downloaded file, it will remain the same
    url: initialURL,
    private: tasks.tabs.get(tabId).private,
  });
  tabBar.addTab(popupTab);
  webviews.add(popupTab, popupId);
  switchToTab(popupTab);
});

webviews.bindEvent("new-tab", (tabId, url, openInForeground) => {
  const newTab = tasks.tabs.add({
    url: url,
    private: tasks.tabs.get(tabId).private, // inherit private status from the current tab
  });

  addTab(newTab, {
    enterEditMode: false,
    openInBackground:
      !settings.get("openTabsInForeground") && !openInForeground,
  });
});

webviews.bindIPC("close-window", (tabId, args) => {
  closeTab(tabId);
});

ipc.on("set-file-view", (e, data) => {
  tasks.tabs.get().forEach((tab) => {
    if (tab.url === data.url) {
      tasks.tabs.update(tab.id, { isFileView: data.isFileView });
    }
  });
});

searchbar.events.on("url-selected", (data) => {
  // var searchbarQuery = searchEngine.getSearch(urlParser.parse(data.url));
  // if (searchbarQuery) {
  //   statistics.incrementValue("searchCounts." + searchbarQuery.engine);
  // }

  if (data.background) {
    const newTab = tasks.tabs.add({
      url: data.url,
      private: tasks.tabs.get(tasks.tabs.getSelected()!).private,
    });
    addTab(newTab, {
      enterEditMode: false,
      openInBackground: true,
    });
  } else {
    webviews.update(tasks.tabs.getSelected(), data.url);
    tabEditor.hide();
  }
});

tabBar.events.on("tab-selected", (id) => {
  switchToTab(id);
});

tabBar.events.on("tab-closed", (id) => {
  closeTab(id);
});
