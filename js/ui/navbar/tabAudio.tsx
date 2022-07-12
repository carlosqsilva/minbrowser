import webviews from "../webviewUtils";
import { currentTab, getTab, updateTab } from "../store";
import { defineShortcut } from "../keybindings";

webviews.bindEvent("media-started-playing", (tabId: string) => {
  updateTab(tabId, { hasAudio: true });
});

webviews.bindEvent("media-paused", (tabId: string) => {
  updateTab(tabId, { hasAudio: false });
});

const toggleAudio = (tabId: string) => {
  const isMuted = getTab(tabId).muted;
  webviews.callAsync(tabId, "setAudioMuted", !isMuted);
  updateTab(tabId, { muted: !isMuted });
};

defineShortcut("toggleTabAudio", () => {
  toggleAudio(currentTab().id);
});

interface TabAudioProps {
  tabId: string;
  muted: boolean;
  hasAudio: boolean;
}

export const TabAudio = (props: TabAudioProps) => {
  return (
    <button
      hidden={!props.hasAudio}
      role="button"
      class="tab-icon tab-audio-button i"
      onClick={[toggleAudio, props.tabId]}
      classList={{
        "carbon:volume-mute": props.muted,
        "carbon:volume-up": !props.muted && props.hasAudio,
      }}
    />
  );
};
