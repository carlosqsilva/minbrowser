import { score } from "string_score";

import * as browserUI from "../browserUI";
import searchbarPlugins from "../searchbar/searchbarPlugins";
var urlParser = require("../util/urlParser.js");
import { Task, tasks } from "../tabState";
import { Tab } from "../tabState/tab";
import { l } from "../../localization";


interface Match {
  task: Task;
  tab: Tab;
  score: number;
}

const searchOpenTabs = (text: string, input: HTMLInputElement, event: any) => {
  searchbarPlugins.reset("openTabs");

  const matches: Match[] = [];
  const searchText = text.toLowerCase();
  const currentTask = tasks.getSelected()!;
  const currentTab = currentTask.tabs.getSelected();

  tasks.forEach((task) => {
    task.tabs.forEach((tab) => {
      if (tab.id === currentTab || !tab.title || !tab.url) {
        return;
      }

      const tabUrl = urlParser.basicURL(tab.url); // don't search protocols

      const exactMatch =
        tab.title.toLowerCase().indexOf(searchText) !== -1 ||
        tabUrl.toLowerCase().indexOf(searchText) !== -1;
      const fuzzyTitleScore = score(tab.title.substring(0, 50), text, 0.5);
      const fuzzyUrlScore = score(tabUrl, text, 0.5) 

      if (exactMatch || fuzzyTitleScore > 0.4 || fuzzyUrlScore > 0.4) {
        matches.push({
          task: task,
          tab: tab,
          score: fuzzyTitleScore + fuzzyUrlScore,
        });
      }
    });
  });

  if (matches.length === 0) {
    return;
  }

  const finalMatches = matches
    .sort((a, b) => {
      if (a.task.id === currentTask.id) {
        a.score += 0.2;
      }
      if (b.task.id === currentTask.id) {
        b.score += 0.2;
      }
      return b.score - a.score;
    })
    .slice(0, 2);

  finalMatches.forEach((match) => {
    var data: any = {
      icon: "carbon:arrow-up-right",
      title: match.tab.title,
      secondaryText: urlParser.basicURL(match.tab.url),
    };

    if (match.task.id !== currentTask.id) {
      const taskName =
        match.task.name ||
        l("taskN").replace("%n", String(tasks.getIndex(match.task.id) + 1));
      data.metadata = [taskName];
    }

    data.click = () => {
      // if we created a new tab but are switching away from it, destroy the current (empty) tab
      const currentTabUrl = tasks.tabs.get(tasks.tabs.getSelected()!).url;
      if (!currentTabUrl) {
        browserUI.closeTab(tasks.tabs.getSelected()!);
      }

      if (match.task.id !== currentTask.id) {
        browserUI.switchToTask(match.task.id);
      }

      browserUI.switchToTab(match.tab.id);
    };

    searchbarPlugins.addResult("openTabs", data);
  });
};

(() => {
  searchbarPlugins.register("openTabs", {
    index: 3,
    trigger: (text) => text.length > 2,
    showResults: searchOpenTabs,
  });
})();
