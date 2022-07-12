import debounce from "lodash.debounce";

import searchbarPlugins from "./searchbarPlugins";
import { urlParser } from "../util/urlParser";
import { searchEngine } from "../util/searchEngine/renderer";
import { tasks } from "../tabState";

function showSearchSuggestions(text, input, event) {
  const suggestionsURL = searchEngine.getCurrent().suggestionsURL;

  if (!suggestionsURL) {
    searchbarPlugins.reset("searchSuggestions");
    return;
  }

  if (
    searchbarPlugins.getResultCount() -
      searchbarPlugins.getResultCount("searchSuggestions") >
    3
  ) {
    searchbarPlugins.reset("searchSuggestions");
    return;
  }

  fetch(suggestionsURL.replace("%s", encodeURIComponent(text)), {
    cache: "force-cache",
  })
    .then((response) => response.json())
    .then((results) => {
      searchbarPlugins.reset("searchSuggestions");

      if (searchbarPlugins.getResultCount() > 3) {
        return;
      }

      if (results) {
        results = results[1].slice(0, 3);
        results.forEach((result) => {
          const data = {
            title: result,
            url: result,
            icon: "carbon:search",
          };

          if (urlParser.isPossibleURL(result)) {
            // website suggestions
            data.icon = "carbon:earth-filled";
          }

          searchbarPlugins.addResult("searchSuggestions", data);
        });
      }
    });
}

(() => {
  searchbarPlugins.register("searchSuggestions", {
    index: 4,
    trigger: (text) => {
      return (
        !!text &&
        text.indexOf("!") !== 0 &&
        !tasks.tabs.get(tasks.tabs.getSelected()!).private
      );
    },
    showResults: debounce(showSearchSuggestions, 50),
  });
})();
