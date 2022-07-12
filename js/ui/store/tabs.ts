import EventEmitter from "node:events";
import { nanoid } from "nanoid";
import { createStore, produce, unwrap } from "solid-js/store";
import { createMemo } from "solid-js";
import { urlParser } from "../shared/urlParser";
import { l } from "../../../localization";

export interface TabColor {
  color: string;
  textColor: string;
  isLowContrast: boolean;
}

export interface Tab {
  url: string;
  title: string;
  id: string;
  lastActivity: number;
  secure?: boolean;
  private: boolean;
  faded?: boolean;
  readerable: boolean;
  themeColor?: TabColor;
  backgroundColor?: TabColor;
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

export interface TabOptions {
  // openInBackground - whether to open the tab without switching to it. Defaults to false.
  openInBackground?: boolean;
  // enterEditMode - whether to enter editing mode when the tab is created. Defaults to true.
  enterEditMode?: boolean;
}

export interface StateView {
  tabs: Tab[];
}
export const tabEvent = new EventEmitter();

const tabHistory: Tab[] = [];
export const [stateView, setStateView] = createStore<StateView>({
  tabs: [],
});

export function selectTab(tabId: string, options?: TabOptions) {
  setStateView(
    produce<StateView>((draft) => {
      for (let i = 0; i < draft.tabs.length; i++) {
        if (draft.tabs[i].id === tabId) {
          draft.tabs[i].selected = true;
          draft.tabs[i].lastActivity = Date.now();
        } else if (draft.tabs[i].selected) {
          draft.tabs[i].selected = false;
          draft.tabs[i].lastActivity = Date.now();
        }
      }
    })
  );

  process.nextTick(() => {
    tabEvent.emit("tab-selected", tabId, options);
  });
}

export function removeAllTabs() {
  setStateView("tabs", []);
}

export const updateTab = (tabId: string, data: Partial<Tab>) => {
  if ("url" in data) {
    data["scrollPosition"] = 0;
  }

  setStateView(
    "tabs",
    (tab) => tab.id === tabId,
    (tab) => {
      tab = { ...tab, ...data };
      if (tab.url === "" || tab.url === urlParser.parse("min://newtab")) {
        // is New Tab
        tab["title"] = l("newTabLabel");
      } else if (tab.title) {
        tab["title"] = tab.title;
      } else if (tab.loaded) {
        tab["title"] = tab.url;
      }

      tab["title"] = (tab["title"] ?? l("newTabLabel")).substring(0, 500);

      return tab;
    }
  );

  process.nextTick(() => {
    for (const key in data) {
      tabEvent.emit("tab-updated", tabId, key);
    }
  });
};

export const updateTabs = (updater: (tab: Tab) => Partial<Tab>) => {
  setStateView("tabs", {}, updater);
};

export function getTab(): Tab[];
export function getTab(tabId: string): Tab;
export function getTab(tabId?: string) {
  if (tabId) {
    return stateView.tabs.find((t) => t.id === tabId);
  }

  return stateView.tabs;
}

export const getTabAtIndex = (index: number) => {
  return stateView.tabs[index];
};

export const tabCount = () => stateView.tabs.length;

export const currentTab = createMemo(() => {
  if (stateView.tabs.length > 0) {
    return stateView.tabs.find((t) => t.selected) ?? stateView.tabs[0];
  }
  return null;
});

export const currentTabIndex = createMemo(() => {
  for (let i = 0; i < stateView.tabs.length; i++) {
    if (stateView.tabs[i].selected) {
      return i;
    }
  }

  return 0;
});

export const duplicateTab = (tabId: string, tabOptions?: Partial<Tab>) => {
  const { id, ...tab } = getTab(tabId);
  return createNewTab(Object.assign({}, tab, tabOptions));
};

export const deleteTab = (tabId: string) => {
  setStateView(
    produce<StateView>((draft) => {
      const tabIndex = draft.tabs.findIndex((t) => t.id === tabId);
      if (tabIndex !== -1) {
        const [tab] = draft.tabs.splice(tabIndex, 1);
        if (!tab.private) {
          tabHistory.push(toPermantState(tab));
        }
      }
    })
  );
};

export const getTabFromHistory = () => {
  return tabHistory.pop();
};

export const getNewTab = (tab: Partial<Tab> = {}): Tab => {
  return {
    url: tab.url || "",
    title: tab.title || l("newTabLabel"),
    id: tab.id ?? nanoid(),
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
    faded: false,
    hasAudio: false,
    previewImage: "",
    isFileView: false,
  };
};

export const createNewTab = (
  tab: Partial<Tab> = {},
  atEnd: boolean = false
) => {
  const newTab = getNewTab(tab);
  setStateView(
    produce<StateView>((draft) => {
      if (atEnd) {
        draft.tabs.push(newTab);
      } else {
        draft.tabs.splice(currentTabIndex() + 1, 0, newTab);
      }
    })
  );

  return newTab;
};

let tempProps: Set<string>;

export function toPermantState(tab: Tab): Tab {
  if (!tempProps) {
    tempProps = new Set(["hasAudio", "previewImage", "loaded"]);
  }

  const keys = Object.keys(tab);
  const newTab = {} as Tab;
  for (const key of keys) {
    if (!tempProps.has(key)) {
      newTab[key] = tab[key];
    }
  }

  return newTab;
}

export function getStringifyableState() {
  const data = unwrap(stateView) as StateView;

  const tabs = [];
  let selectedTab = null;

  for (const tab of data.tabs) {
    if (tab.private) continue;
    if (tab.selected && tab.id !== selectedTab) {
      selectedTab = tab.id;
    }

    tabs.push(toPermantState(tab));
  }

  if (!selectedTab && tabs.length === 1) {
    selectedTab = tabs[0].id;
  }

  if (!selectedTab) {
    selectedTab = tabs.sort((a, b) => b.lastActivity - a.lastActivity)[0].id;
  }

  return {
    tabs,
    selected: selectedTab,
  };
}
