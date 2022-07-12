import { For, Show } from "solid-js";
import {
  tabEvent,
  stateView,
  currentTab,
  selectTab,
  setEditorVisible,
} from "../store";
import { l } from "../../../localization";
import { TabAudio } from "./tabAudio";
import { TabReader } from "./tabReader";

const handleTabSelect = (tabId: string) => {
  console.log(`Selected tab: ${tabId}`);

  if (currentTab().id !== tabId) {
    selectTab(tabId);
  } else {
    setEditorVisible();
  }
};

const handleTabClose = (tabId: string, e: Event) => {
  // prevent the searchbar from being opened
  e.stopPropagation();
  tabEvent.emit("tab-closed", tabId);
};

export const Tabs = () => {
  return (
    <For each={stateView.tabs}>
      {(tab) => {
        return (
          <div
            role="tab"
            class="tab-item"
            title={
              tab.private ? `${tab.title} (${l("privateTab")})` : tab.title
            }
            data-tab={tab.id}
            onClick={[handleTabSelect, tab.id]}
            classList={{
              active: tab.selected,
              fade: tab.faded,
            }}
          >
            <TabReader tabId={tab.id} readerable={tab.readerable} />
            <TabAudio
              tabId={tab.id}
              muted={tab.muted}
              hasAudio={tab.hasAudio}
            />
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

            <span class="title">{tab.title}</span>
          </div>
        );
      }}
    </For>
  );
};
