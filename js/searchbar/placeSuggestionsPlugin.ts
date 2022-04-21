import searchbarPlugins from "./searchbarPlugins";
import * as searchbarUtils from "./searchbarUtils";
import { urlParser } from "../util/urlParser";

import { places } from "../places/places";
import { tasks } from "../tabState";

function showPlaceSuggestions(text, input, event) {
  // use the current tab's url for history suggestions, or the previous tab if the current tab is empty
  let { url } = tasks.tabs.get(tasks.tabs.getSelected()!);

  if (!url) {
    const previousTab = tasks.tabs.getAtIndex(
      tasks.tabs.getIndex(tasks.tabs.getSelected()!) - 1
    );
    if (previousTab) {
      url = previousTab.url;
    }
  }

  places.getPlaceSuggestions(url, (results) => {
    searchbarPlugins.reset("placeSuggestions");

    const tabList = tasks.tabs.get().map((tab) => {
      return tab.url;
    });

    results = results.filter((item) => {
      return tabList.indexOf(item.url) === -1;
    });

    results.slice(0, 4).forEach((result) => {
      searchbarPlugins.addResult("placeSuggestions", {
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

(() => {
  searchbarPlugins.register("placeSuggestions", {
    index: 1,
    trigger: (text) => !text,
    showResults: showPlaceSuggestions,
  });
})();
