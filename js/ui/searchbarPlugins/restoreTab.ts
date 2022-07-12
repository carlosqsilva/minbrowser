import * as searchbar from "../searchbar";
import * as searchbarUtils from "../shared/searchbarUtils";
import * as browserUI from "../browserUI"

import { l } from "../../../localization";
import { createNewTab, getTab, selectTab } from "../store";
import { getSavedSession } from "../session";

function getFormattedTitle(tab) {
  if (tab.title) {
    const title = searchbarUtils.getRealTitle(tab.title);
    return (
      '"' +
      (title.length > 45 ? title.substring(0, 45).trim() + "..." : title) +
      '"'
    );
  } else {
    return l("newTabLabel");
  }
}

const pluginName = "restoreSession";

function showRestoreTask() {
  const sessionState = getSavedSession();

  if (!sessionState) return;

  const restoreSession = () => {
    getTab().forEach((tab) => {
      if (!tab.url) browserUI.destroyTab(tab.id)
    })

    sessionState.tabs.forEach((tab) => createNewTab(tab, true));
    requestIdleCallback(() => {
      selectTab(sessionState.selected);
    })
  };

  const recentTabs = sessionState.tabs
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, 3);

  let description: string;
  if (recentTabs.length === 1) {
    description = getFormattedTitle(recentTabs[0]);
  } else if (recentTabs.length === 2) {
    description = l("taskDescriptionTwo")
      .replace("%t", getFormattedTitle(recentTabs[0]))
      .replace("%t", getFormattedTitle(recentTabs[1]));
  } else {
    description = l("taskDescriptionThree")
      .replace("%t", getFormattedTitle(recentTabs[0]))
      .replace("%t", getFormattedTitle(recentTabs[1]))
      .replace("%n", String(sessionState.tabs.length - 2));
  }

  searchbar.addResult(pluginName, {
    title: l("returnToSession"),
    descriptionBlock: description,
    icon: "carbon:redo",
    click: restoreSession,
  });
}

export const restoreTab: searchbar.Plugin = {
  name: pluginName,
  showResults: showRestoreTask,
  trigger: (text: string) => !text && performance.now() < 15000,
};
