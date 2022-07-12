// @ts-check
/* list of the available custom !bangs */

import fs from "fs";
import { ipcRenderer as ipc } from "electron";

import { l } from "../../localization/view";
import { Task, tasks } from "../tabState";
import { registerCustomBang } from "./bangsPlugin";

import webviews from "../webviews";
import * as browserUI from "../browserUI";
import * as focusMode from "../focusMode";
import { places } from "../places/places";
import { contentBlockingToggle } from "../navbar/contentBlockingToggle";
import taskOverlay from "../taskOverlay/taskOverlay";
import bookmarkConverter from "../bookmarkConverter"

(() => {
  registerCustomBang({
    phrase: "!settings",
    snippet: l("viewSettings"),
    isAction: true,
    fn: (text) => {
      webviews.update(tasks.tabs.getSelected(), "min://settings");
    },
  });

  registerCustomBang({
    phrase: "!back",
    snippet: l("goBack"),
    isAction: true,
    fn: (text) => {
      webviews.callAsync(tasks.tabs.getSelected()!, "goBack");
    },
  });

  registerCustomBang({
    phrase: "!forward",
    snippet: l("goForward"),
    isAction: true,
    fn: (text) => {
      webviews.callAsync(tasks.tabs.getSelected()!, "goForward");
    },
  });

  registerCustomBang({
    phrase: "!screenshot",
    snippet: l("takeScreenshot"),
    isAction: true,
    fn: (text) => {
      setTimeout(() => {
        // wait so that the view placeholder is hidden
        ipc.send("saveViewCapture", { id: tasks.tabs.getSelected() });
      }, 400);
    },
  });

  registerCustomBang({
    phrase: "!clearhistory",
    snippet: l("clearHistory"),
    isAction: true,
    fn: (text) => {
      if (confirm(l("clearHistoryConfirmation"))) {
        places.deleteAllHistory();
        ipc.invoke("clearStorageData");
      }
    },
  });

  registerCustomBang({
    phrase: "!enableblocking",
    snippet: l("enableBlocking"),
    isAction: true,
    fn: (text) => {
      contentBlockingToggle.enableBlocking(
        tasks.tabs.get(tasks.tabs.getSelected()!).url
      );
    },
  });

  registerCustomBang({
    phrase: "!disableblocking",
    snippet: l("disableBlocking"),
    isAction: true,
    fn: (text) => {
      contentBlockingToggle.disableBlocking(
        tasks.tabs.get(tasks.tabs.getSelected()!).url
      );
    },
  });

  // returns a task with the same name or index ("1" returns the first task, etc.)
  function getTaskByNameOrNumber(text) {
    const textAsNumber = parseInt(text);

    return tasks.find(
      (task, index) =>
        (task.name && task.name.toLowerCase() === text) ||
        index + 1 === textAsNumber
    );
  }

  registerCustomBang({
    phrase: "!task",
    snippet: l("switchToTask"),
    isAction: false,
    fn: (text) => {
      /* disabled in focus mode */
      if (focusMode.isEnabled()) {
        focusMode.focusModeWarn();
        return;
      }

      text = text.toLowerCase();

      // no task was specified, show all of the tasks
      if (!text) {
        taskOverlay.show();
        return;
      }

      const task = getTaskByNameOrNumber(text);

      if (task) {
        browserUI.switchToTask(task.id);
      }
    },
  });

  registerCustomBang({
    phrase: "!newtask",
    snippet: l("createTask"),
    isAction: true,
    fn: (text) => {
      /* disabled in focus mode */
      if (focusMode.isEnabled()) {
        focusMode.focusModeWarn();
        return;
      }

      taskOverlay.show();

      setTimeout(() => {
        browserUI.addTask();
        if (text) {
          tasks.getSelected()!.name = text;
        }
      }, 600);
    },
  });

  registerCustomBang({
    phrase: "!movetotask",
    snippet: l("moveToTask"),
    isAction: false,
    fn: (text) => {
      /* disabled in focus mode */
      if (focusMode.isEnabled()) {
        focusMode.focusModeWarn();
        return;
      }

      // remove the tab from the current task

      const currentTab = tasks.tabs.get(tasks.tabs.getSelected()!);
      tasks.tabs.destroy(currentTab.id);

      // make sure the task has at least one tab in it
      if (tasks.tabs.count() === 0) {
        tasks.tabs.add();
      }

      let newTask = getTaskByNameOrNumber(text);

      if (newTask) {
        newTask.tabs.add(currentTab, { atEnd: true });
      } else {
        // create a new task with the given name
        newTask = tasks.get(
          tasks.add(undefined, tasks.getIndex(tasks.getSelected()?.id) + 1)
        )!;

        newTask.name = text;

        newTask.tabs.add(currentTab);
      }

      browserUI.switchToTask(newTask.id);
      browserUI.switchToTab(currentTab.id);
      taskOverlay.show();

      setTimeout(() => {
        taskOverlay.hide();
      }, 600);
    },
  });

  registerCustomBang({
    phrase: "!closetask",
    snippet: l("closeTask"),
    isAction: false,
    fn: (text) => {
      const currentTask = tasks.getSelected()!;
      let taskToClose!: Task | undefined | null;

      if (text) {
        taskToClose = getTaskByNameOrNumber(text);
      } else {
        taskToClose = tasks.getSelected();
      }

      if (taskToClose) {
        browserUI.closeTask(taskToClose.id);
        if (currentTask.id === taskToClose.id) {
          taskOverlay.show();
          setTimeout(() => {
            taskOverlay.hide();
          }, 600);
        }
      }
    },
  });

  registerCustomBang({
    phrase: "!nametask",
    snippet: l("nameTask"),
    isAction: false,
    fn: (text) => {
      tasks.getSelected()!.name = text;
    },
  });

  registerCustomBang({
    phrase: "!importbookmarks",
    snippet: l("importBookmarks"),
    isAction: true,
    fn: async () => {
      const filePath = await ipc.invoke("showOpenDialog", {
        filters: [{ name: "HTML files", extensions: ["htm", "html"] }],
      });

      if (!filePath) {
        return;
      }
      fs.readFile(filePath[0], "utf-8", (err, data) => {
        if (err || !data) {
          console.warn(err);
          return;
        }
        bookmarkConverter.import(data);
      });
    },
  });

  registerCustomBang({
    phrase: "!exportbookmarks",
    snippet: l("exportBookmarks"),
    isAction: true,
    fn: async () => {
      const data = await bookmarkConverter.exportAll();

      if (data) {
        // save the result
        const savePath = await ipc.invoke("showSaveDialog", {
          defaultPath: "bookmarks.html",
        });
  
        fs.writeFileSync(savePath, data);
      }
    },
  });

  registerCustomBang({
    phrase: "!addbookmark",
    snippet: l("addBookmark"),
    fn: (text) => {
      const { url } = tasks.tabs.get(tasks.tabs.getSelected()!);
      if (url) {
        places.updateItem(
          url,
          {
            isBookmarked: true,
            tags: text
              ? text.split(/\s/g).map((t) => t.replace("#", "").trim())
              : [],
          },
          () => {}
        );
      }
    },
  });
})();
