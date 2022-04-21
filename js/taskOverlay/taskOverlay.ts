import { ipcRenderer } from "electron";

import webviews from "../webviews";
import * as keybindings from "../keybindings";
import * as browserUI from "../browserUI";
import tabBar from "../navbar/tabBar";
import tabEditor from "../navbar/tabEditor";
import * as focusMode from "../focusMode";
import modalMode from "../modalMode";
import keyboardNavigationHelper from "../util/keyboardNavigationHelper";

import { createTaskComponent } from "./taskOverlayBuilder";

const taskContainer = document.getElementById("task-area") as HTMLDivElement;
const taskSwitcherButton = document.getElementById(
  "switch-task-button"
) as HTMLButtonElement;
const addTaskButton = document.getElementById("add-task") as HTMLButtonElement;
const addTaskLabel = addTaskButton.querySelector("span") as HTMLSpanElement;
const taskOverlayNavbar = document.getElementById(
  "task-overlay-navbar"
) as HTMLDivElement;

import { empty } from "../util/utils";
import { l } from "../../localization";
import { tasks } from "../tabState";
import { Tab } from "../tabState/tab";

function getTaskContainer(id) {
  return document.querySelector(
    '.task-container[data-task="{id}"]'.replace("{id}", id)
  );
}

let draggingScrollInterval: NodeJS.Timeout;

function onMouseMoveWhileDragging(e) {
  clearInterval(draggingScrollInterval);
  if (e.pageY < 100) {
    draggingScrollInterval = setInterval(function () {
      taskContainer?.scrollBy(0, -5);
    }, 16);
  } else if (e.pageY > window.innerHeight - 125) {
    draggingScrollInterval = setInterval(function () {
      taskContainer?.scrollBy(0, 5);
    }, 16);
  }
}

function startMouseDragRecording() {
  window.addEventListener("mousemove", onMouseMoveWhileDragging);
}

function endMouseDragRecording() {
  window.removeEventListener("mousemove", onMouseMoveWhileDragging);
  clearInterval(draggingScrollInterval);
}

class TaskOverlay {
  public overlayElement = document.getElementById(
    "task-overlay"
  ) as HTMLDivElement;
  public isShown = false;

  public show() {
    /* disabled in focus mode */
    if (focusMode.isEnabled()) {
      focusMode.focusModeWarn();
      return;
    }

    webviews.requestPlaceholder("taskOverlay");

    document.body.classList.add("task-overlay-is-shown");

    tabEditor.hide();

    (document.getElementById("task-search-input") as HTMLInputElement).value =
      "";

    this.isShown = true;
    taskSwitcherButton.classList.add("active");

    this.render();

    // un-hide the overlay
    this.overlayElement.hidden = false;

    // scroll to the selected element and focus it
    const currentTabElement = document.querySelector(
      '.task-tab-item[data-tab="{id}"]'.replace(
        "{id}",
        tasks.getSelected()?.tabs.getSelected()!
      )
    ) as HTMLDivElement;

    if (currentTabElement) {
      currentTabElement.classList.add("fakefocus");
      currentTabElement.focus();
    }
  }

  public render() {
    empty(taskContainer);

    // show the task elements
    tasks.forEach((task, index) => {
      const el = createTaskComponent(task, index, {
        tabSelect: (tab: Tab) => {
          browserUI.switchToTask(task.id);
          browserUI.switchToTab(tab.id);

          this.hide();
        },
        tabDelete: (item) => {
          const tabId = item.getAttribute("data-tab");

          tasks.get(task.id)?.tabs.destroy(tabId);
          webviews.destroy(tabId);

          tabBar.updateAll();

          // if there are no tabs left, remove the task
          if (task.tabs.count() === 0) {
            // remove the task element from the overlay
            getTaskContainer(task.id)?.remove();
            // close the task
            browserUI.closeTask(task.id);
          }
        },
      });

      taskContainer.appendChild(el);
    });
  }

  public hide() {
    if (this.isShown) {
      this.isShown = false;
      this.overlayElement.hidden = true;

      // wait until the animation is complete to remove the tab elements
      setTimeout(() => {
        if (!this.isShown) {
          empty(taskContainer);
          webviews.hidePlaceholder("taskOverlay");
        }
      }, 250);

      document.body.classList.remove("task-overlay-is-shown");

      // close any tasks that are pending deletion
      const pendingDeleteTasks = document.body.querySelectorAll(
        ".task-container.deleting"
      );

      for (let i = 0; i < pendingDeleteTasks.length; i++) {
        browserUI.closeTask(pendingDeleteTasks[i].getAttribute("data-task"));
      }

      // if the current tab has been deleted, switch to the most recent one
      if (!tasks.tabs.getSelected()) {
        const [mostRecentTab] = tasks.tabs.get().sort((a, b) => {
          return b.lastActivity - a.lastActivity;
        });

        if (mostRecentTab) {
          browserUI.switchToTab(mostRecentTab.id);
        }
      }

      // force the UI to rerender
      browserUI.switchToTask(tasks.getSelected()?.id!);
      browserUI.switchToTab(tasks.tabs.getSelected());

      taskSwitcherButton.classList.remove("active");
    }
  }

  public toggle() {
    if (this.isShown) {
      this.hide();
    } else {
      this.show();
    }
  }

  public initializeSearch() {
    const container = document.querySelector(
      ".task-search-input-container"
    ) as HTMLDivElement;
    const input = document.getElementById(
      "task-search-input"
    ) as HTMLInputElement;

    input.placeholder = l("tasksSearchTabs") + " (T)";

    container.addEventListener("click", (e) => {
      e.stopPropagation();
      input.focus();
    });

    this.overlayElement.addEventListener("keyup", (e) => {
      if (
        e.key.toLowerCase() === "t" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        input.focus();
      }
    });

    input.addEventListener("blur", () => {
      input.value = "";
      this.render();
    });

    input.addEventListener("input", (e) => {
      const search = input.value.toLowerCase().trim();

      if (!search) {
        // reset the overlay
        taskOverlay.render();
        input.focus();
        return;
      }

      let totalTabMatches = 0;

      tasks.forEach((task) => {
        const taskContainer = document.querySelector(
          `.task-container[data-task="${task.id}"]`
        ) as HTMLDivElement;

        let taskTabMatches = 0;
        task.tabs.forEach((tab) => {
          const tabContainer = document.querySelector(
            `.task-tab-item[data-tab="${tab.id}"]`
          ) as HTMLDivElement;

          const searchText = (
            task.name +
            " " +
            tab.title +
            " " +
            tab.url
          ).toLowerCase();

          const searchMatches = search
            .split(" ")
            .every((word) => searchText.includes(word));

          if (searchMatches) {
            tabContainer.hidden = false;
            taskTabMatches++;
            totalTabMatches++;

            if (totalTabMatches === 1) {
              // first match
              tabContainer.classList.add("fakefocus");
            } else {
              tabContainer.classList.remove("fakefocus");
            }
          } else {
            tabContainer.hidden = true;
          }
        });

        if (taskTabMatches === 0) {
          taskContainer.hidden = true;
        } else {
          taskContainer.hidden = false;
          taskContainer.classList.remove("collapsed");
        }
      });
    });

    input.addEventListener("keypress", (e) => {
      if (e.keyCode === 13) {
        const firstTab = this.overlayElement.querySelector(
          ".task-tab-item:not([hidden])"
        ) as HTMLDivElement;
        if (firstTab) {
          firstTab.click();
        }
      }
    });
  }

  constructor() {
    this.initializeSearch();

    keyboardNavigationHelper.addToGroup("taskOverlay", this.overlayElement);

    // swipe down on the tabstrip to show the task overlay
    document.getElementById("navbar")?.addEventListener("wheel", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // https://github.com/minbrowser/min/issues/698
        return;
      }
      if (e.deltaY < -30 && e.deltaX < 10) {
        this.show();
        e.stopImmediatePropagation();
      }
    });

    keybindings.defineShortcut("toggleTasks", () => {
      if (this.isShown) {
        this.hide();
      } else {
        this.show();
      }
    });

    keybindings.defineShortcut({ keys: "esc" }, (e) => {
      this.hide();
    });

    keybindings.defineShortcut("enterEditMode", (e) => {
      this.hide();
    });

    keybindings.defineShortcut("addTask", addTaskFromMenu);
    ipcRenderer.on("addTask", addTaskFromMenu); // for menu item

    taskSwitcherButton.title = l("viewTasks");
    addTaskLabel.textContent = l("newTask");

    taskSwitcherButton.addEventListener("click", () => {
      this.toggle();
    });

    addTaskButton.addEventListener("click", (e) => {
      browserUI.switchToTask(tasks.add());
      this.hide();
    });

    taskOverlayNavbar.addEventListener("click", () => {
      this.hide();
    });
  }
}

const taskOverlay = new TaskOverlay();

function addTaskFromMenu() {
  /* new tasks can't be created in modal mode */
  if (modalMode.enabled()) {
    return;
  }

  /* new tasks can't be created in focus mode or modal mode */
  if (focusMode.isEnabled()) {
    focusMode.focusModeWarn();
    return;
  }

  browserUI.addTask();
  taskOverlay.show();
  setTimeout(() => {
    taskOverlay.hide();
    tabEditor.show(tasks.tabs.getSelected());
  }, 600);
}

export default taskOverlay;
