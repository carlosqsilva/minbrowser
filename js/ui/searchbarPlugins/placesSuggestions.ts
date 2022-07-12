import * as searchbar from "../searchbar";
import * as searchbarUtils from "../shared/searchbarUtils";
import { urlParser } from "../shared/urlParser";

import { places } from "../places/places";
import { currentTab, currentTabIndex, getTab, getTabAtIndex } from "../store";

const pluginName = "placeSuggestions";

function showPlaceSuggestions(text, input, event) {
  // use the current tab's url for history suggestions, or the previous tab if the current tab is empty
  // let { url } = tasks.tabs.get(tasks.tabs.getSelected()!);
  let url = currentTab()?.url;

  if (!url) {
    const previousTab = getTabAtIndex(currentTabIndex() - 1);

    if (previousTab) {
      url = previousTab.url;
    }
  }

  places.getPlaceSuggestions(url, (results) => {
    searchbar.resetPlugin(pluginName);

    const tabList = getTab().map((tab) => tab.url);

    results = results.filter((item) => {
      return tabList.indexOf(item.url) === -1;
    });

    results.slice(0, 4).forEach((result) => {
      searchbar.addResult(pluginName, {
        title: urlParser.prettyURL(result.url),
        secondaryText: searchbarUtils.getRealTitle(result.title),
        url: result.url,
        delete: () => {
          places.deleteHistory(result.url);
        },
      });
    });
  });
}

export const placesSuggestions: searchbar.Plugin = {
  name: pluginName,
  trigger: (text) => !text,
  showResults: showPlaceSuggestions,
};

// (() => {
//   searchbarPlugins.register("placeSuggestions", {
//     index: 1,
//     trigger: (text) => !text,
//     showResults: showPlaceSuggestions,
//   });
// })();
