import debounce from "lodash.debounce";

import * as searchbar from "../searchbar";
import { urlParser } from "../shared/urlParser";
import { searchEngine } from "../searchEngine/renderer";
import { currentTab } from "../store";

function showSearchSuggestions(text, input, event) {
  const suggestionsURL = searchEngine.getCurrent().suggestionsURL;

  if (!suggestionsURL) {
    searchbar.resetPlugin("searchSuggestions");
    return;
  }

  if (
    searchbar.getResultCount() - searchbar.getResultCount("searchSuggestions") >
    3
  ) {
    searchbar.resetPlugin("searchSuggestions");
    return;
  }

  fetch(suggestionsURL.replace("%s", encodeURIComponent(text)), {
    cache: "force-cache",
  })
    .then((response) => response.json())
    .then((results) => {
      searchbar.resetPlugin("searchSuggestions");

      if (searchbar.getResultCount() > 3) {
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

          searchbar.addResult("searchSuggestions", data);
        });
      }
    });
}

export const searchSuggestion: searchbar.Plugin = {
  name: "searchSuggestions",
  showResults: debounce(showSearchSuggestions, 50),
  trigger: (text: string) => {
    return !!text && text.indexOf("!") !== 0 && !currentTab()?.private;
  },
};
