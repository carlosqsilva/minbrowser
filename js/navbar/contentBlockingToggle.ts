import webviews from "../webviews";
import settings from "../util/settings/settings";
import * as remoteMenu from "../remoteMenuRenderer";

import { tasks } from "../tabState";
import { l } from "../../localization";

export const contentBlockingToggle = {
  enableBlocking: (url: string) => {
    if (!url) {
      return;
    }
    const domain = new URL(url).hostname;

    const setting = settings.get("filtering") ?? {};

    if (!setting.exceptionDomains) {
      setting.exceptionDomains = [];
    }

    setting.exceptionDomains = setting.exceptionDomains.filter(
      (d) => d.replace(/^www\./g, "") !== domain.replace(/^www\./g, "")
    );
    settings.set("filtering", setting);
    webviews.callAsync(tasks.tabs.getSelected(), "reload");
  },
  disableBlocking: (url: string) => {
    if (!url) {
      return;
    }

    const domain = new URL(url).hostname;

    const setting = settings.get("filtering") ?? {};

    if (!setting.exceptionDomains) {
      setting.exceptionDomains = [];
    }
    // make sure the domain isn't already an exception
    if (
      !setting.exceptionDomains.some(
        (d) => d.replace(/^www\./g, "") === domain.replace(/^www\./g, "")
      )
    ) {
      setting.exceptionDomains.push(domain);
    }
    settings.set("filtering", setting);
    webviews.callAsync(tasks.tabs.getSelected(), "reload");
  },
  isBlockingEnabled: (url: string) => {
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch (e) {
      return false;
    }

    const setting = settings.get("filtering");
    return (
      !setting ||
      !setting.exceptionDomains ||
      !setting.exceptionDomains.some(
        (d) => d.replace(/^www\./g, "") === domain.replace(/^www\./g, "")
      )
    );
  },
  create: () => {
    const button = document.createElement("button");
    button.className = "tab-editor-button i carbon:manage-protection";

    button.addEventListener("click", (e) => {
      contentBlockingToggle.showMenu(button);
    });

    return button;
  },
  showMenu: (button) => {
    const url = tasks.tabs.get(tasks.tabs.getSelected()).url;
    const menu = [
      [
        {
          type: "checkbox",
          label: l("enableBlocking"),
          checked: contentBlockingToggle.isBlockingEnabled(url),
          click: function () {
            if (contentBlockingToggle.isBlockingEnabled(url)) {
              contentBlockingToggle.disableBlocking(url);
            } else {
              contentBlockingToggle.enableBlocking(url);
            }
            contentBlockingToggle.update(tasks.tabs.getSelected(), button);
          },
        },
      ],
      [
        {
          label: l("appMenuReportBug"),
          click: function () {
            var newTab = tasks.tabs.add({
              url:
                "https://github.com/minbrowser/min/issues/new?title=Content%20blocking%20issue%20on%20" +
                encodeURIComponent(url),
            });
            require("../browserUI.js").addTab(newTab, { enterEditMode: false });
          },
        },
      ],
    ];
    remoteMenu.open(menu);
  },
  update: (tabId: string, button: HTMLButtonElement) => {
    if (
      !tasks.tabs.get(tabId).url.startsWith("http") &&
      !tasks.tabs.get(tabId).url.startsWith("https")
    ) {
      button.hidden = true;
      return;
    }

    if (
      settings.get("filtering") &&
      settings.get("filtering").blockingLevel === 0
    ) {
      button.hidden = true;
      return;
    }

    button.hidden = false;
    if (contentBlockingToggle.isBlockingEnabled(tasks.tabs.get(tabId).url)) {
      button.style.opacity = String(1);
    } else {
      button.style.opacity = String(0.4);
    }
  },
};
