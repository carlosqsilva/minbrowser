import { score } from "string_score";

import * as browserUI from "../browserUI";
import * as searchbar from "../searchbar";
import { urlParser } from "../shared/urlParser";
import { currentTab, getTab, Tab } from "../store";

interface Match {
  tab: Tab;
  score: number;
}

const searchOpenTabs = (text: string, input: HTMLInputElement, event: any) => {
  searchbar.resetPlugin("openTabs");

  const matches: Match[] = [];
  const searchText = text.toLowerCase();

  getTab().forEach((tab) => {
    if (tab.id === currentTab()?.id || !tab.title || !tab.url) {
      return;
    }

    const tabUrl = urlParser.basicURL(tab.url); // don't search protocols

    const exactMatch =
      tab.title.toLowerCase().indexOf(searchText) !== -1 ||
      tabUrl.toLowerCase().indexOf(searchText) !== -1;
    const fuzzyTitleScore = score(tab.title.substring(0, 50), text, 0.5);
    const fuzzyUrlScore = score(tabUrl, text, 0.5);

    if (exactMatch || fuzzyTitleScore > 0.4 || fuzzyUrlScore > 0.4) {
      matches.push({
        tab: tab,
        score: fuzzyTitleScore + fuzzyUrlScore,
      });
    }
  });

  if (matches.length === 0) {
    return;
  }

  const finalMatches = matches
    .sort((a, b) => {
      if (a.tab.id === currentTab().id) {
        a.score += 0.2;
      }
      if (b.tab.id === currentTab().id) {
        b.score += 0.2;
      }
      return b.score - a.score;
    })
    .slice(0, 2);

  finalMatches.forEach((match) => {
    const data: searchbar.Result = {
      icon: "carbon:arrow-up-right",
      title: match.tab.title,
      secondaryText: urlParser.basicURL(match.tab.url),
    };

    data.click = () => {
      // if we created a new tab but are switching away from it, destroy the current (empty) tab
      if (!currentTab().url) {
        browserUI.closeTab(currentTab().id);
      }

      browserUI.switchToTab(match.tab.id);
    };

    searchbar.addResult("openTabs", data);
  });
};

export const openTabs: searchbar.Plugin = {
  name: "openTabs",
  trigger: (text: string) => text.length > 2,
  showResults: searchOpenTabs,
};
