import { TaskList } from "./task";
import { tasks } from ".";

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

export class TabList {
  public tabs: Tab[];
  public parentTaskList?: TaskList;

  //tab properties that shouldn't be saved to disk

  static temporaryProperties = ["hasAudio", "previewImage", "loaded"];

  constructor(tabs?: Tab[], parentTaskList?: TaskList) {
    this.tabs = tabs || [];
    this.parentTaskList = parentTaskList;
  }

  public add(tab: Partial<Tab> = {}, options: any = {}) {
    const tabId = String(
      tab.id || Math.round(Math.random() * 100000000000000000)
    ); // you can pass an id that will be used, or a random one will be generated.

    const newTab: Tab = {
      url: tab.url || "",
      title: tab.title || "",
      id: tabId,
      lastActivity: tab.lastActivity || Date.now(),
      secure: tab.secure,
      private: tab.private || false,
      readerable: tab.readerable || false,
      themeColor: tab.themeColor,
      backgroundColor: tab.backgroundColor,
      scrollPosition: tab.scrollPosition || 0,
      selected: tab.selected || false,
      muted: tab.muted || false,
      loaded: tab.loaded || false,
      hasAudio: false,
      previewImage: "",
      isFileView: false,
    };

    if (options.atEnd) {
      this.tabs.push(newTab);
    } else {
      this.tabs.splice(this.getSelectedIndex() + 1, 0, newTab);
    }

    this.parentTaskList?.emit("tab-added", tabId);

    return tabId;
  }

  update(id: string, data) {
    if (!this.has(id)) {
      throw new ReferenceError(
        "Attempted to update a tab that does not exist."
      );
    }
    const index = this.getIndex(id);

    for (var key in data) {
      if (data[key] === undefined) {
        throw new ReferenceError("Key " + key + " is undefined.");
      }
      this.tabs[index][key] = data[key];
      this.parentTaskList?.emit("tab-updated", id, key);
      // changing URL erases scroll position
      if (key === "url") {
        this.tabs[index].scrollPosition = 0;
        this.parentTaskList?.emit("tab-updated", id, "scrollPosition");
      }
    }
  }

  destroy(id: string) {
    const index = this.getIndex(id);
    if (index < 0) return false;

    tasks
      .getTaskContainingTab(id)
      ?.tabHistory.push(toPermanentState(this.tabs[index]));

    this.tabs.splice(index, 1);

    this.parentTaskList?.emit("tab-destroyed", id);

    return index;
  }

  destroyAll() {
    // this = [] doesn't work, so set the length of the array to 0 to remove all of the itemss
    this.tabs.length = 0;
  }

  get(): Tab[];
  get(id: string): Tab;
  get(id?: string | null) {
    if (!id) {
      // no id provided, return an array of all tabs
      // it is important to copy the tab objects when returning them. Otherwise, the original tab objects get modified when the returned tabs are modified (such as when processing a url).
      const tabsToReturn: Tab[] = [];
      for (const tab of this.tabs) {
        tabsToReturn.push(Object.assign({}, tab));
      }
      return tabsToReturn;
    }

    for (const tab of this.tabs) {
      if (tab.id === id) {
        return Object.assign({}, tab);
      }
    }

    return undefined;
  }

  has(id: string) {
    return this.getIndex(id) > -1;
  }

  getIndex(id: string) {
    for (let i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i].id === id) {
        return i;
      }
    }

    return -1;
  }

  getSelected() {
    for (const tab of this.tabs) {
      if (tab.selected) {
        return tab.id;
      }
    }
    return null;
  }

  getSelectedIndex() {
    for (let i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i].selected) {
        return i;
      }
    }
    return 0;
  }

  getAtIndex(index: number) {
    return this.tabs[index] || undefined;
  }

  setSelected(id: string) {
    if (!this.has(id)) {
      throw new ReferenceError(
        "Attempted to select a tab that does not exist."
      );
    }
    for (var i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i].id === id) {
        this.tabs[i].selected = true;
        this.tabs[i].lastActivity = Date.now();
      } else if (this.tabs[i].selected) {
        this.tabs[i].selected = false;
        this.tabs[i].lastActivity = Date.now();
      }
    }

    this.parentTaskList?.emit("tab-selected", id);
  }

  moveBy(id: string, offset: number) {
    var currentIndex = this.getIndex(id);
    var newIndex = currentIndex + offset;
    var newIndexTab = this.getAtIndex(newIndex);
    if (newIndexTab) {
      var currentTab = this.getAtIndex(currentIndex);
      this.splice(currentIndex, 1, newIndexTab);
      this.splice(newIndex, 1, currentTab);
    }
  }

  count() {
    return this.tabs.length;
  }

  isEmpty() {
    if (!this.tabs || this.tabs.length === 0) {
      return true;
    }

    if (this.tabs.length === 1 && !this.tabs[0].url) {
      return true;
    }

    return false;
  }

  forEach(fun: (tab: Tab) => void) {
    return this.tabs.forEach(fun);
  }

  splice(...args: any) {
    return this.tabs.splice.apply(this.tabs, args);
  }

  

  getStringifyableState() {
    return this.tabs.map((tab) => toPermanentState(tab));
  }
}

function toPermanentState(tab: Tab): Partial<Tab> {
  //removes temporary properties of the tab that are lost on page reload

  const result = {};
  Object.keys(tab)
    .filter((key) => !TabList.temporaryProperties.includes(key))
    .forEach((key) => (result[key] = tab[key]));

  return result;
}