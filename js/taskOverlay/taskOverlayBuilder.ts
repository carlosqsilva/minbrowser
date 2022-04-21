// @ts-check

import * as browserUI from "../browserUI";
import * as searchbarUtils from "../searchbar/searchbarUtils";
import { urlParser } from "../util/urlParser";
import { searchEngine } from "../util/searchEngine/renderer";

import { Task, tasks } from "../tabState";
import { l } from "../../localization";
import { Tab } from "../tabState/tab";

const faviconMinimumLuminance = 70; // minimum brightness for a "light" favicon

function getTaskRelativeDate(task) {
  const minimumDate = new Date();
  minimumDate.setHours(0);
  minimumDate.setMinutes(0);
  minimumDate.setSeconds(0);
  let minimumTime = minimumDate.getTime();
  minimumTime -= 5 * 24 * 60 * 60 * 1000;

  const time = tasks.getLastActivity(task.id);
  const d = new Date(time);

  // don't show times for recent tasks in order to save space
  if (time > minimumTime) {
    return null;
  } else {
    return new Intl.DateTimeFormat(navigator.language, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
  }
}

function toggleCollapsed(taskContainer: HTMLDivElement, task: Task) {
  tasks.get(task.id)!.collapsed = !tasks.isCollapsed(task.id);
  taskContainer.classList.toggle("collapsed");

  const collapseButton = taskContainer.querySelector(".task-collapse-button");
  collapseButton?.classList.toggle("carbon:chevron-right");
  collapseButton?.classList.toggle("carbon:chevron-down");

  if (tasks.isCollapsed(task.id)) {
    collapseButton?.setAttribute("aria-expanded", "false");
  } else {
    collapseButton?.setAttribute("aria-expanded", "true");
  }
}

interface TabEvents {
  tabSelect: (...args: any) => void;
  tabDelete: (...args: any) => void;
}

function createTabElement(
  tabContainer: HTMLUListElement,
  task: Task,
  tab: Tab,
  events: TabEvents
) {
  const data: any = {
    classList: ["task-tab-item"],
    delete: events.tabDelete,
    showDeleteButton: true,
  };

  if (tab.private) {
    data.icon = "carbon:view-off";
  } else if (tab.favicon) {
    data.iconImage = tab.favicon.url;

    if (
      tab.favicon.luminance &&
      tab.favicon.luminance < faviconMinimumLuminance
    ) {
      data.classList.push("has-dark-favicon");
    }
  }

  const source = urlParser.getSourceURL(tab.url);
  const searchQuery = searchEngine.getSearch(source);

  if (searchQuery) {
    data.title = searchQuery.search;
    data.secondaryText = searchQuery.engine;
  } else {
    data.title = tab.title || l("newTabLabel");
    data.secondaryText = urlParser.basicURL(source);
  }

  const el = searchbarUtils.createItem(data);

  el.setAttribute("data-tab", tab.id);

  el.addEventListener("click", () => events.tabSelect(tab));

  return el;
}

function createTabContainer(task: Task, events) {
  const tabContainer = document.createElement("ul");
  tabContainer.className = "task-tabs-container";
  tabContainer.setAttribute("data-task", task.id);

  if (task.tabs) {
    for (var i = 0; i < task.tabs.count(); i++) {
      var el = createTabElement(
        tabContainer,
        task,
        task.tabs.getAtIndex(i),
        events
      );
      tabContainer.appendChild(el);
    }
  }

  return tabContainer;
}

function createTaskNameInputField(task, taskIndex) {
  const input = document.createElement("input");
  input.classList.add("task-name");
  input.classList.add("mousetrap");

  const taskName = l("defaultTaskName").replace("%n", taskIndex + 1);

  input.placeholder = taskName;
  input.value = task.name || taskName;
  input.spellcheck = false;

  input.addEventListener("keyup", (e) => {
    if (e.keyCode === 13) {
      input.blur();
    }

    task.name = input.value;
  });

  input.addEventListener("focusin", (e) => {
    if (tasks.isCollapsed(task.id)) {
      input.blur();
      return;
    }
    input.select();
  });

  return input;
}

function createTaskCollapseButton(taskContainer, task) {
  const collapseButton = document.createElement("button");
  collapseButton.className = "task-collapse-button i";
  collapseButton.setAttribute("tabindex", "-1");

  collapseButton.setAttribute("aria-haspopup", "true");
  if (tasks.isCollapsed(task.id)) {
    collapseButton.classList.add("carbon:chevron-right");
    collapseButton.setAttribute("aria-expanded", "false");
  } else {
    collapseButton.classList.add("carbon:chevron-down");
    collapseButton.setAttribute("aria-expanded", "true");
  }
  collapseButton.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCollapsed(taskContainer, task);
  });

  return collapseButton;
}

function createTaskDeleteButton(container, task) {
  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete-button i carbon:trash-can";
  deleteButton.tabIndex = -1; // needed for keyboardNavigationHelper

  deleteButton.addEventListener("click", (e) => {
    if (task.tabs.isEmpty()) {
      container.remove();
      browserUI.closeTask(task.id);
    } else {
      container.classList.add("deleting");
      setTimeout(() => {
        if (container.classList.contains("deleting")) {
          container.style.opacity = 0;
          // transitionend would be nice here, but it doesn't work if the element is removed from the DOM
          setTimeout(() => {
            container.remove();
            browserUI.closeTask(task.id);
          }, 500);
        }
      }, 10000);
    }
  });

  return deleteButton;
}

function createTaskActionContainer(taskContainer, task, taskIndex) {
  const taskActionContainer = document.createElement("div");
  taskActionContainer.className = "task-action-container";

  // add the collapse button
  const collapseButton = createTaskCollapseButton(taskContainer, task);
  taskActionContainer.appendChild(collapseButton);

  // add the input for the task name
  const input = createTaskNameInputField(task, taskIndex);
  taskActionContainer.appendChild(input);

  // add the delete button
  var deleteButton = createTaskDeleteButton(taskContainer, task);
  taskActionContainer.appendChild(deleteButton);

  return taskActionContainer;
}

function createTaskInfoContainer(task) {
  const infoContainer = document.createElement("div");
  infoContainer.className = "task-info-container";

  const date = getTaskRelativeDate(task);

  if (date) {
    const dateEl = document.createElement("span");
    dateEl.className = "task-date";
    dateEl.textContent = date;
    infoContainer.appendChild(dateEl);
  }

  const lastTabEl = document.createElement("span");
  lastTabEl.className = "task-last-tab-title";
  let lastTabTitle = task.tabs
    .get()
    .sort((a, b) => b.lastActivity - a.lastActivity)[0].title;

  if (lastTabTitle) {
    lastTabTitle = searchbarUtils.getRealTitle(lastTabTitle);
    if (lastTabTitle.length > 40) {
      lastTabTitle = lastTabTitle.substring(0, 40) + "...";
    }
    lastTabEl.textContent = searchbarUtils.getRealTitle(lastTabTitle);
  }
  infoContainer.appendChild(lastTabEl);

  let favicons: any[] = [];
  let faviconURLs: any[] = [];

  task.tabs
    .get()
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .forEach((tab) => {
      if (tab.favicon) {
        favicons.push(tab.favicon);
        faviconURLs.push(tab.favicon.url);
      }
    });

  if (favicons.length > 0) {
    var faviconsEl = document.createElement("span");
    faviconsEl.className = "task-favicons";
    favicons = favicons.filter((i, idx) => faviconURLs.indexOf(i.url) === idx);

    favicons.forEach(function (favicon) {
      var img = document.createElement("img");
      img.src = favicon.url;
      if (favicon.luminance < faviconMinimumLuminance) {
        img.classList.add("dark-favicon");
      }
      faviconsEl.appendChild(img);
    });

    infoContainer.appendChild(faviconsEl);
  }

  return infoContainer;
}

function createTaskDeleteWarning(container, task) {
  const deleteWarning = document.createElement("div");
  deleteWarning.className = "task-delete-warning";

  // @ts-ignore
  deleteWarning.innerHTML = l("taskDeleteWarning").unsafeHTML;
  deleteWarning.addEventListener("click", (e) => {
    container.classList.remove("deleting");
  });
  return deleteWarning;
}

export function createTaskComponent(task: Task, taskIndex: number, events) {
  const container = document.createElement("div");
  container.className = "task-container";

  if (task.id !== tasks.getSelected()?.id && tasks.isCollapsed(task.id)) {
    container.classList.add("collapsed");
  }
  if (task.id === tasks.getSelected()?.id) {
    container.classList.add("selected");
  }
  container.setAttribute("data-task", task.id);

  container.addEventListener("click", (e) => {
    if (tasks.isCollapsed(task.id)) {
      toggleCollapsed(container, task);
    }
  });

  const taskActionContainer = createTaskActionContainer(
    container,
    task,
    taskIndex
  );
  container.appendChild(taskActionContainer);

  const infoContainer = createTaskInfoContainer(task);
  container.appendChild(infoContainer);

  const deleteWarning = createTaskDeleteWarning(container, task);
  container.appendChild(deleteWarning);

  const tabContainer = createTabContainer(task, events);
  container.appendChild(tabContainer);

  return container;
}

// module.exports = function createTaskContainer(task, index, events) {
//   return TaskOverlayBuilder.create.task.container(task, index, events);
// };
