import EventEmitter from "events";

import { createStore, produce } from "solid-js/store";
import { createUniqueId, createMemo } from "solid-js";

export interface Tab {
  url: string;
  title: string;
  id: string;
  lastActivity: number;
  secure?: boolean;
  private: boolean;
  readerable: boolean;
  themeColor?: {
    color: string;
    textColor: string;
    isLowContrast: boolean;
  };
  backgroundColor?: {
    color: string;
    textColor: string;
    isLowContrast: boolean;
  };
  scrollPosition: number;
  selected: boolean;
  muted: boolean;
  loaded: boolean;
  hasAudio?: boolean;
  previewImage?: string;
  isFileView?: boolean;
  favicon?: {
    url: string;
    luminance: number;
  };
}

export interface Task {
  name: string | null;
  tabs: Tab[];
  tabHistory: Tab[];
  collapsed?: boolean;
  id: string;
}

interface TaskRestored extends Omit<Task, "tabs"> {
  tabs: Tab[];
}

type Func = (id: string, key?: string) => void;

interface Event {
  name: string;
  fn: Func;
}

interface TaskListInterface {
  selected: string | null;
  tasks: Task[];
  events: Event[];
  pendingCallbacks: [Func, any][];
  editorHidden: boolean;
}

let pendingCallbackTimeout!: NodeJS.Timeout | null;

export const [state, setState] = createStore<TaskListInterface>({
  selected: null,
  tasks: [],
  events: [],
  pendingCallbacks: [],
  editorHidden: false,
});

export const events = new EventEmitter();

export const currentTaskIndex = createMemo(() => {
  return state.tasks.findIndex((t) => t.id === state.selected);
});

export const currentTask = createMemo(() => state.tasks[currentTaskIndex()]);

export const selectTab = (tabId: string) => {
  setState(
    produce<TaskListInterface>((draft) => {
      const tabs = draft.tasks[currentTaskIndex()].tabs;
      for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].id === tabId) {
          tabs[i].selected = true;
          tabs[i].lastActivity = Date.now();
        } else if (tabs[i].selected) {
          tabs[i].selected = false;
          tabs[i].lastActivity = Date.now();
        }
      }
    })
  );
  events.emit("tab-selected", tabId);
};

export const currentTab = createMemo(() => {
  return currentTask()?.tabs.find((t) => t.selected);
});

export const toggleEditorVisibility = () => {
  setState("editorHidden", (s) => !s);
};

export function getTask(id: string | null) {
  return state.tasks.find((task) => task.id === id) || null;
}

export function onTaskEvent(name: string, fn: Event["fn"]) {
  setState("events", (e) => [...e, { name, fn }]);
}

export function emitTaskEvent(name: string, ...data: any) {
  setState(
    produce<TaskListInterface>((draft) => {
      draft.events.forEach((listener) => {
        if (listener.name === name) {
          draft.pendingCallbacks.push([listener.fn, data]);

          // run multiple events in one timeout, since calls to setTimeout() appear to be slow (at least based on timeline data)
          if (!pendingCallbackTimeout) {
            pendingCallbackTimeout = setTimeout(() => {
              draft.pendingCallbacks.forEach(([fn, data]) => fn(data));
              draft.pendingCallbacks = [];
              pendingCallbackTimeout = null;
            }, 0);
          }
        }
      });
    })
  );
}

export function addTask(task?: TaskRestored, index?: number) {
  const newTask: Task = {
    name: task?.name || null,
    tabs: task?.tabs ?? [],
    tabHistory: task?.tabHistory,
    collapsed: task?.collapsed, // this property must stay undefined if it is already (since there is a difference between "explicitly uncollapsed" and "never collapsed")
    id: task?.id ?? createUniqueId(),
  };

  setState(
    produce<TaskListInterface>((draft) => {
      if (index) {
        draft.tasks.splice(index, 0, newTask);
      } else {
        draft.tasks.push(newTask);
      }
    })
  );

  this.emit("task-added", newTask.id);

  return newTask.id;
}
