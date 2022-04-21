// @ts-check

import fs from "fs";
import path from "path";

import * as browserUI from "./browserUI";
import tabEditor from "./navbar/tabEditor";
import { getConfig } from "./util/utils";
import { tasks } from "./tabState";

class SessionRestore {
  public savePath = path.join(
    getConfig("user-data-path"),
    "sessionRestore.json"
  );
  public previousState: string | null = null;

  public save(forceSave?: boolean, sync?: boolean) {
    const stateString = JSON.stringify(tasks.getStringifyableState());
    const data = {
      version: 2,
      state: JSON.parse(stateString),
      saveTime: Date.now(),
    };

    // save all tabs that aren't private

    for (var i = 0; i < data.state.tasks.length; i++) {
      data.state.tasks[i].tabs = data.state.tasks[i].tabs.filter((tab) => {
        return !tab.private;
      });
    }

    if (forceSave === true || stateString !== this.previousState) {
      if (sync === true) {
        fs.writeFileSync(this.savePath, JSON.stringify(data));
      } else {
        fs.writeFile(this.savePath, JSON.stringify(data), (err) => {
          if (err) {
            console.warn(err);
          }
        });
      }
      this.previousState = stateString;
    }
  }

  public restore() {
    let savedStringData;

    try {
      savedStringData = fs.readFileSync(this.savePath, "utf-8");
    } catch (e) {
      console.warn("failed to read session restore data", e);
    }

    /*
    Disabled - show a user survey on startup
    // the survey should only be shown after an upgrade from an earlier version
    var shouldShowSurvey = false
    if (savedStringData && !localStorage.getItem('1.15survey')) {
      shouldShowSurvey = true
    }
    localStorage.setItem('1.15survey', 'true')
    */

    try {
      // first run, show the tour
      if (!savedStringData) {
        tasks.setSelected(tasks.add()); // create a new task

        const newTab = tasks.getSelected()?.tabs.add({
          url: "https://minbrowser.github.io/min/tour",
        });
        browserUI.addTab(newTab, {
          enterEditMode: false,
        });
        return;
      }

      const data = JSON.parse(savedStringData);

      // the data isn't restorable
      if (
        (data.version && data.version !== 2) ||
        (data.state && data.state.tasks && data.state.tasks.length === 0)
      ) {
        tasks.setSelected(tasks.add());

        browserUI.addTab(tasks.getSelected()?.tabs.add());
        return;
      }

      // add the saved tasks

      data.state.tasks.forEach((task) => {
        // restore the task item
        tasks.add(task);

        /*
        If the task contained only private tabs, none of the tabs will be contained in the session restore data, but tasks must always have at least 1 tab, so create a new empty tab if the task doesn't have any.
        */
        if (task.tabs.length === 0) {
          tasks.get(task.id)?.tabs.add();
        }
      });
      tasks.setSelected(data.state.selectedTask);

      // switch to the previously selected tasks

      if (
        tasks.getSelected()?.tabs.isEmpty() ||
        !data.saveTime ||
        Date.now() - data.saveTime < 30000
      ) {
        browserUI.switchToTask(data.state.selectedTask);
        if (tasks.getSelected()?.tabs.isEmpty()) {
          tabEditor.show(tasks.getSelected()?.tabs.getSelected());
        }
      } else {
        window.createdNewTaskOnStartup = true;
        // try to reuse a previous empty task
        const lastTask = tasks.byIndex(tasks.getLength() - 1);
        if (lastTask && lastTask.tabs.isEmpty() && !lastTask.name) {
          browserUI.switchToTask(lastTask.id);
          tabEditor.show(lastTask.tabs.getSelected());
        } else {
          browserUI.addTask();
        }
      }
    } catch (e) {
      // an error occured while restoring the session data

      console.error("restoring session failed: ", e);

      const backupSavePath = path.join(
        getConfig("user-data-path"),
        "sessionRestoreBackup-" + Date.now() + ".json"
      );

      fs.writeFileSync(backupSavePath, savedStringData);

      // destroy any tabs that were created during the restore attempt
      tasks.reset();

      // create a new tab with an explanation of what happened
      const newTask = tasks.add();
      const newSessionErrorTab = tasks.get(newTask)?.tabs.add({
        url:
          "file://" +
          __dirname +
          "/pages/sessionRestoreError/index.html?backupLoc=" +
          encodeURIComponent(backupSavePath),
      });

      browserUI.switchToTask(newTask);
      browserUI.switchToTab(newSessionErrorTab);
    }
  }

  constructor() {
    setInterval(() => this.save(), 30000);

    window.onbeforeunload = (e) => {
      this.save(true, true);
    };
  }
}

const sessionRestore = new SessionRestore();

export default sessionRestore;
