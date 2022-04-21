import EventEmitter from "events";

import webviews from "../webviews";
import * as focusMode from "../focusMode";
import readerView from "../readerView";
import tabAudio from "../tabAudio";
import settings from "../util/settings/settings";
import { urlParser } from "../util/urlParser";
// import * as keybindings from '../keybindings'

import tabEditor from "./tabEditor";
import * as progressBar from "./progressBar";
import { permissionRequests } from "./permissionRequests";

import { tasks } from "../tabState";
import { empty } from "../util/utils";
import { l } from "../../localization";

let lastTabDeletion = 0; // TODO get rid of this

class TabBar {
  public navBar = document.getElementById("navbar");
  public container = document.getElementById("tabs");
  public containerInner = document.getElementById("tabs-inner");
  public tabElementMap = {}; // tabId: tab element
  public events = new EventEmitter();

  public getTab(tabId) {
    return this.tabElementMap[tabId];
  }

  public getTabInput(tabId) {
    return this.getTab(tabId).querySelector(".tab-input");
  }

  public setActiveTab(tabId) {
    const activeTab = document.querySelector(".tab-item.active");

    if (activeTab) {
      activeTab.classList.remove("active");
      activeTab.removeAttribute("aria-selected");
    }

    var el = this.getTab(tabId);
    el.classList.add("active");
    el.setAttribute("aria-selected", "true");

    requestAnimationFrame(() => {
      el.scrollIntoView();
    });
  }

  public createTab(data) {
    const tabEl = document.createElement("div");
    tabEl.className = "tab-item";
    tabEl.setAttribute("data-tab", data.id);
    tabEl.setAttribute("role", "tab");

    tabEl.appendChild(readerView.getButton(data.id));
    tabEl.appendChild(tabAudio.getButton(data.id));
    tabEl.appendChild(progressBar.create());

    // icons

    const iconArea = document.createElement("span");
    iconArea.className = "tab-icon-area";

    if (data.private) {
      var pbIcon = document.createElement("i");
      pbIcon.className =
        "icon-tab-is-private tab-icon tab-info-icon i carbon:view-off";
      iconArea.appendChild(pbIcon);
    }

    var secIcon = document.createElement("i");
    secIcon.className =
      "icon-tab-not-secure tab-icon tab-info-icon i carbon:unlocked";
    secIcon.title = l("connectionNotSecure");
    iconArea.appendChild(secIcon);

    var closeTabButton = document.createElement("button");
    closeTabButton.className = "tab-icon tab-close-button i carbon:close";

    closeTabButton.addEventListener("click", (e) => {
      this.events.emit("tab-closed", data.id);
      // prevent the searchbar from being opened
      e.stopPropagation();
    });

    iconArea.appendChild(closeTabButton);

    tabEl.appendChild(iconArea);

    // title

    const title = document.createElement("span");
    title.className = "title";

    tabEl.appendChild(title);

    // click to enter edit mode or switch to a tab
    tabEl.addEventListener("click", (e) => {
      if (tasks.tabs.getSelected() !== data.id) {
        // else switch to tab if it isn't focused
        this.events.emit("tab-selected", data.id);
      } else {
        // the tab is focused, edit tab instead
        tabEditor.show(data.id);
      }
    });

    tabEl.addEventListener("auxclick", (e) => {
      if (e.which === 2) {
        // if mouse middle click -> close tab
        this.events.emit("tab-closed", data.id);
      }
    });

    tabEl.addEventListener("wheel", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // https://github.com/minbrowser/min/issues/698
        return;
      }
      if (
        e.deltaY > 65 &&
        e.deltaX < 10 &&
        Date.now() - lastTabDeletion > 900
      ) {
        // swipe up to delete tabs
        lastTabDeletion = Date.now();

        /* tab deletion is disabled in focus mode */
        if (focusMode.isEnabled()) {
          focusMode.focusModeWarn();
          return;
        }

        tabEl.style.transform = "translateY(-100%)";

        setTimeout(() => {
          this.events.emit("tab-closed", data.id);
        }, 150); // wait until the animation has completed
      }
    });

    this.updateTab(data.id, tabEl);

    return tabEl;
  }

  public updateTab(tabId: string, tabEl = this.getTab(tabId)) {
    const tabData = tasks.tabs.get(tabId);

    // update tab title
    let tabTitle: string;

    const isNewTab =
      tabData.url === "" || tabData.url === urlParser.parse("min://newtab");
    if (isNewTab) {
      tabTitle = l("newTabLabel");
    } else if (tabData.title) {
      tabTitle = tabData.title;
    } else if (tabData.loaded) {
      tabTitle = tabData.url;
    }

    tabTitle = (tabTitle! || l("newTabLabel")).substring(0, 500);

    var titleEl = tabEl.querySelector(".title");
    titleEl.textContent = tabTitle;

    tabEl.title = tabTitle;
    if (tabData.private) {
      tabEl.title += " (" + l("privateTab") + ")";
    }

    // update tab audio icon
    const audioButton = tabEl.querySelector(".tab-audio-button");
    tabAudio.updateButton(tabId, audioButton);

    tabEl
      .querySelectorAll(".permission-request-icon")
      .forEach((el) => el.remove());

    permissionRequests
      .getButtons(tabId)
      .reverse()
      .forEach((button) => {
        tabEl.insertBefore(button, tabEl.children[0]);
      });

    const secIcon = tabEl.getElementsByClassName("icon-tab-not-secure")[0];
    if (tabData.secure === false) {
      secIcon.hidden = false;
    } else {
      secIcon.hidden = true;
    }
  }

  public updateAll() {
    empty(this.containerInner!);
    this.tabElementMap = {};

    tasks.tabs.get().forEach((tab) => {
      const el = this.createTab(tab);
      this.containerInner?.appendChild(el);
      this.tabElementMap[tab.id] = el;
    });

    if (tasks.tabs.getSelected()) {
      this.setActiveTab(tasks.tabs.getSelected());
    }
  }

  public addTab(tabId: string) {
    const tab = tasks.tabs.get(tabId);
    const index = tasks.tabs.getIndex(tabId);

    const tabEl = this.createTab(tab);
    this.containerInner?.insertBefore(
      tabEl,
      this.containerInner.childNodes[index]
    );
    this.tabElementMap[tabId] = tabEl;
  }

  public removeTab(tabId) {
    const tabEl = this.getTab(tabId);
    if (tabEl) {
      // The tab does not have a corresponding .tab-item element.
      // This happens when destroying tabs from other task where this .tab-item is not present
      this.containerInner?.removeChild(tabEl);
      delete this.tabElementMap[tabId];
    }
  }

  public handleDividerPreference(dividerPreference) {
    if (dividerPreference === true) {
      this.navBar?.classList.add("show-dividers");
    } else {
      this.navBar?.classList.remove("show-dividers");
    }
  }
}

const tabBar = new TabBar();

settings.listen("showDividerBetweenTabs", (dividerPreference) => {
  tabBar.handleDividerPreference(dividerPreference);
});

/* tab loading and progress bar status */
webviews.bindEvent("did-start-loading", (tabId) => {
  progressBar.update(
    tabBar.getTab(tabId).querySelector(".progress-bar"),
    "start"
  );
  tasks.tabs.update(tabId, { loaded: false });
});

webviews.bindEvent("did-stop-loading", (tabId) => {
  progressBar.update(
    tabBar.getTab(tabId).querySelector(".progress-bar"),
    "finish"
  );
  tasks.tabs.update(tabId, { loaded: true });
  tabBar.updateTab(tabId);
});

tasks.on("tab-updated", (id, key) => {
  const updateKeys = ["title", "secure", "url", "muted", "hasAudio"];
  if (updateKeys.includes(key as string)) {
    tabBar.updateTab(id);
  }
});

permissionRequests.onChange((tabId) => {
  tabBar.updateTab(tabId);
});

tabBar.container?.addEventListener("dragover", (e) => e.preventDefault());

tabBar.container?.addEventListener("drop", (e) => {
  e.preventDefault();
  const data = e.dataTransfer;
  require("../browserUI.js").addTab(
    tasks.tabs.add({
      url: data?.files[0]
        ? "file://" + data.files[0].path
        : data?.getData("text"),
      private: tasks.tabs.get(tasks.tabs.getSelected()!).private,
    }),
    {
      enterEditMode: false,
      openInBackground: !settings.get("openTabsInForeground"),
    }
  );
});

export default tabBar;
