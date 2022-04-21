import { TabList } from "./tab";
import { TabStack } from "../tabRestore";

import { Tab } from "./tab";

export interface Task {
  name: string | null;
  tabs: TabList;
  tabHistory: TabStack;
  collapsed?: boolean; // this property must stay undefined if it is already (since there is a difference between "explicitly uncollapsed" and "never collapsed")
  id: string;
}

interface Event {
  name: string;
  fn: (id: string, key?: string) => void;
}

interface TaskRestored extends Omit<Task, "tabs"> {
  tabs: Tab[];
}

export class TaskList {
  selected!: string | null;
  tasks!: Task[];
  tabs!: TabList;
  events!: Event[];
  pendingCallbacks!: any[];
  pendingCallbackTimeout!: NodeJS.Timeout | null;

  constructor() {
    this.reset();
  }

  reset() {
    this.selected = null;
    this.tasks = []; // each task is {id, name, tabs: [], tabHistory: TabStack}
    this.tabs = new TabList();
    this.events = [];
    this.pendingCallbacks = [];
    this.pendingCallbackTimeout = null;
  }

  on(name: string, fn: Event["fn"]) {
    this.events.push({ name, fn });
  }

  emit(name: string, ...data) {
    this.events.forEach((listener) => {
      if (listener.name === name) {
        this.pendingCallbacks.push([listener.fn, data]);

        // run multiple events in one timeout, since calls to setTimeout() appear to be slow (at least based on timeline data)
        if (!this.pendingCallbackTimeout) {
          this.pendingCallbackTimeout = setTimeout(() => {
            this.pendingCallbacks.forEach((t) => t[0].apply(this, t[1]));
            this.pendingCallbacks = [];
            this.pendingCallbackTimeout = null;
          }, 0);
        }
      }
    });
  }

  add(task?: TaskRestored, index?: number) {
    const newTask: Task = {
      name: task?.name || null,
      tabs: new TabList(task?.tabs, this),
      tabHistory: new TabStack(task?.tabHistory),
      collapsed: task?.collapsed, // this property must stay undefined if it is already (since there is a difference between "explicitly uncollapsed" and "never collapsed")
      id: task?.id || String(TaskList.getRandomId()),
    };

    if (index) {
      this.tasks.splice(index, 0, newTask);
    } else {
      this.tasks.push(newTask);
    }

    this.emit("task-added", newTask.id);

    return newTask.id;
  }

  getStringifyableState() {
    return {
      tasks: this.tasks.map((task) =>
        Object.assign({}, task, { tabs: task.tabs.getStringifyableState() })
      ),
      selectedTask: this.selected,
    };
  }

  get(id: string | null) {
    return this.find((task) => task.id === id) || null;
  }

  getSelected() {
    return this.get(this.selected);
  }

  byIndex(index) {
    return this.tasks[index];
  }

  getTaskContainingTab(tabId) {
    return this.find((task) => task.tabs.has(tabId)) || null;
  }

  getIndex(id) {
    return this.tasks.findIndex((task) => task.id === id);
  }

  setSelected(id) {
    this.selected = id;
    this.tabs = this.get(id)!.tabs;
    this.emit("task-selected", id);
    this.emit("tab-selected", this.tabs.getSelected());
  }

  destroy(id) {
    const index = this.getIndex(id);

    // emit the tab-destroyed event for all tabs in this task
    this.get(id)!.tabs.forEach((tab) => this.emit("tab-destroyed", tab.id));

    this.emit("task-destroyed", id);

    if (index < 0) return false;

    this.tasks.splice(index, 1);

    if (this.selected === id) {
      this.selected = null;
    }

    return index;
  }

  destroyAll() {
    this.tasks = [];
    this.selected = null;
  }

  getLastActivity(id: string) {
    const tabs = this.get(id)!.tabs;
    let lastActivity = 0;

    for (var i = 0; i < tabs.count(); i++) {
      if (tabs.getAtIndex(i).lastActivity > lastActivity) {
        lastActivity = tabs.getAtIndex(i).lastActivity;
      }
    }

    return lastActivity;
  }

  isCollapsed(id: string) {
    const task = this.get(id);
    return (
      task!.collapsed ||
      (task!.collapsed === undefined &&
        Date.now() - this.getLastActivity(task!.id) > 7 * 24 * 60 * 60 * 1000)
    );
  }

  getLength() {
    return this.tasks.length;
  }

  map<T>(fun: (task: Task) => T): T[] {
    return this.tasks.map(fun);
  }

  forEach(fun: (task: Task, index: number) => void) {
    return this.tasks.forEach(fun);
  }

  indexOf(task) {
    return this.tasks.indexOf(task);
  }

  slice(...args: any) {
    return this.tasks.slice.apply(this.tasks, args);
  }

  splice(...args: any) {
    return this.tasks.splice.apply(this.tasks, args);
  }

  filter(...args: any) {
    return this.tasks.filter.apply(this.tasks, args);
  }

  find(filter: (task: Task, i: number, tasks: Task[]) => boolean) {
    for (var i = 0, len = this.tasks.length; i < len; i++) {
      if (filter(this.tasks[i], i, this.tasks)) {
        return this.tasks[i];
      }
    }
  }

  static getRandomId() {
    return Math.round(Math.random() * 100000000000000000);
  }
}
