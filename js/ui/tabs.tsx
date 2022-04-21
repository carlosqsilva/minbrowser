import { For, Show } from "solid-js";
import {
  events,
  currentTask,
  currentTab,
  emitTaskEvent,
  selectTab,
  toggleEditorVisibility,
  Tab,
} from "./state";
import { l } from "../../localization/view";
import { urlParser } from "../util/urlParser";

const handleTabSelect = (tabId: string) => {
  if (currentTab().id !== tabId) {
    selectTab(tabId)
  } else {
    toggleEditorVisibility();
  }
};

const handleTabClose = (tabId: string, e: Event) => {
  // this.events.emit("tab-closed", tab.id);
  // prevent the searchbar from being opened
  e.stopPropagation();
};

const handleWheelEvent = (e: MouseEvent) => {
  // if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
  //   // https://github.com/minbrowser/min/issues/698
  //   return;
  // }
  // if (
  //   e.deltaY > 65 &&
  //   e.deltaX < 10 &&
  //   Date.now() - lastTabDeletion > 900
  // ) {
  //   // swipe up to delete tabs
  //   lastTabDeletion = Date.now();
  //   tabEl.style.transform = "translateY(-100%)";
  //   setTimeout(() => {
  //     this.events.emit("tab-closed", data.id);
  //   }, 150); // wait until the animation has completed
  // }
};

const getTitle = (tab: Tab) => {
  let tabTitle: string;

  if (tab.url === "" || tab.url === urlParser.parse("min://newtab")) {
    tabTitle = l("newTabLabel");
  } else if (tab.title) {
    tabTitle = tab.title;
  } else if (tab.loaded) {
    tabTitle = tab.url;
  }

  return (tabTitle ?? l("newTabLabel")).substring(0, 500);
};

export const Tabs = () => {
  return (
    <div id="tabs-inner" role="tablist" class="has-thin-scrollbar">
      <For each={currentTask()?.tabs}>
        {(tab) => {
          const title = getTitle(tab);

          return (
            <div
              role="tab"
              class="tab-item"
              title={title}
              data-tab={tab.id}
              onClick={[handleTabSelect, tab.id]}
              onWheel={[handleWheelEvent, tab.id]}
              classList={{
                selected: tab.selected,
              }}
            >
              {/* <ReaderButton /> */}
              {/* <AudioButton /> */}
              <span class="tab-icon-area">
                <Show when={tab.private}>
                  <i class="icon-tab-is-private tab-icon tab-info-icon i carbon:view-off" />
                </Show>
                <i
                  class="icon-tab-not-secure tab-icon tab-info-icon i carbon:unlocked"
                  title={l("connectionNotSecure")}
                />
                <button
                  class="tab-icon tab-close-button i carbon:close"
                  onClick={[handleTabClose, tab.id]}
                />
              </span>

              <span class="title">{title}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
};
