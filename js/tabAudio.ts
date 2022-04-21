// @ts-check

import webviews from "./webviews";
import * as keybindings from "./keybindings";

import { tasks } from "./tabState"

class TabAudio {
  public muteIcon = "carbon:volume-mute";
  public volumeIcon = "carbon:volume-up";

  public getButton(tabId) {
    const button = document.createElement("button");
    button.className = "tab-icon tab-audio-button i";

    button.setAttribute("data-tab", tabId);
    button.setAttribute("role", "button");

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleAudio(tabId);
    });

    this.updateButton(tabId, button);

    return button;
  }

  public updateButton(tabId, target?: HTMLButtonElement) {
    const button =
      target ||
      (document.querySelector(
        '.tab-audio-button[data-tab="{id}"]'.replace("{id}", tabId)
      ) as HTMLButtonElement);

    if (!button) return;

    const tab = tasks.tabs.get(tabId);

    const muteIcon = this.muteIcon;
    const volumeIcon = this.volumeIcon;

    if (tab.muted) {
      button.hidden = false;
      button.classList.remove(volumeIcon);
      button.classList.add(muteIcon);
    } else if (tab.hasAudio) {
      button.hidden = false;
      button.classList.add(volumeIcon);
      button.classList.remove(muteIcon);
    } else {
      button.hidden = true;
    }
  }

  public toggleAudio(tabId) {
    const tab = tasks.tabs.get(tabId);
    // can be muted if has audio, can be unmuted if muted
    if (tab.hasAudio || tab.muted) {
      webviews.callAsync(tabId, "setAudioMuted", !tab.muted);
      tasks.tabs.update(tabId, { muted: !tab.muted });
    }
  }

  constructor() {
    keybindings.defineShortcut("toggleTabAudio", () => {
      this.toggleAudio(tasks.tabs.getSelected());
    });

    webviews.bindEvent("media-started-playing", (tabId) => {
      tasks.tabs.update(tabId, { hasAudio: true });
    });

    webviews.bindEvent("media-paused", (tabId) => {
      tasks.tabs.update(tabId, { hasAudio: false });
    });
  }
}

const tabAudio = new TabAudio();

export default tabAudio;
