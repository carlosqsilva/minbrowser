import debounce from "lodash.debounce";
import { searchbar } from "./searchbar";
import searchbarPlugins from "./searchbarPlugins";
import * as searchbarUtils from "./searchbarUtils";
import * as searchbarAutocomplete from "../util/autocomplete";
const urlParser = require("../util/urlParser.js");

import { places } from "../places/places";
import { searchEngine } from "../util/searchEngine/renderer";

let currentResponseSent = 0;

function showSearchbarPlaceResults(
  text: string,
  input: HTMLInputElement,
  event,
  pluginName = "places"
) {
  const responseSent = Date.now();

  let searchFn, resultCount;
  if (pluginName === "fullTextPlaces") {
    searchFn = (text: string, cb: any) => places.searchPlacesFullText(text, cb);
    resultCount = 4 - searchbarPlugins.getResultCount("places");
  } else {
    searchFn = (text: string, cb: any, opt: any) =>
      places.searchPlaces(text, cb, opt);
    resultCount = 4;
  }

  // only autocomplete an item if the delete key wasn't pressed
  let canAutocomplete = event && event.keyCode !== 8;

  searchFn(text, (results) => {
    // prevent responses from returning out of order
    if (responseSent < currentResponseSent) {
      return;
    }

    currentResponseSent = responseSent;

    searchbarPlugins.reset(pluginName);

    results = results.slice(0, resultCount);

    results.forEach((result, index) => {
      let didAutocompleteResult = false;

      const searchQuery = searchEngine.getSearch(result.url);

      if (canAutocomplete) {
        // if the query is autocompleted, pressing enter will search for the result using the current search engine, so only pages from the current engine should be autocompleted
        if (
          searchQuery &&
          searchQuery.engine === searchEngine.getCurrent().name &&
          index === 0
        ) {
          const acResult = searchbarAutocomplete.autocomplete(input, [
            searchQuery.search!,
          ]);
          if (acResult.valid) {
            canAutocomplete = false;
            didAutocompleteResult = true;
          }
        } else {
          var autocompletionType = searchbarAutocomplete.autocompleteURL(
            input,
            result.url
          );

          if (autocompletionType !== -1) {
            canAutocomplete = false;
          }

          if (autocompletionType === 0) {
            // the domain was autocompleted, show a domain result item
            var domain = new URL(result.url).hostname;

            searchbarPlugins.setTopAnswer(pluginName, {
              title: domain,
              url: domain,
              fakeFocus: true,
            });
          }
          if (autocompletionType === 1) {
            didAutocompleteResult = true;
          }
        }
      }

      let data = {
        url: result.url,
        metadata: result.tags,
        descriptionBlock: results.length < 4 ? result.searchSnippet : null,
        delete: function () {
          places.deleteHistory(result.url);
        },
        icon: "carbon:wikis",
      } as any;

      if (searchQuery) {
        data.title = searchQuery.search;
        data.secondaryText = searchQuery.engine;
        data.icon = "carbon:search";
      } else {
        data.title = urlParser.prettyURL(urlParser.getSourceURL(result.url));
        data.secondaryText = searchbarUtils.getRealTitle(result.title);
      }

      // show a star for bookmarked items
      if (result.isBookmarked) {
        data.icon = "carbon:star-filled";
      } 

      
      // create the item
      if (didAutocompleteResult) {
        // if this exact URL was autocompleted, show the item as the top answer
        data.fakeFocus = true;
        searchbarPlugins.setTopAnswer(pluginName, data);
      } else {
        searchbarPlugins.addResult(pluginName, data);
      }
    });
  });
}

(() => {
  searchbarPlugins.register("places", {
    index: 1,
    trigger: (text) => !!text && text.indexOf("!") !== 0,
    showResults: showSearchbarPlaceResults,
  });

  searchbarPlugins.register("fullTextPlaces", {
    index: 2,
    trigger: (text) => !!text && text.indexOf("!") !== 0,
    showResults: debounce((text, input, event) =>  {
      if (
        searchbarPlugins.getResultCount("places") < 4 &&
        searchbar.associatedInput
      ) {
        showSearchbarPlaceResults(text, input, event, "fullTextPlaces")
      } else {
        // can't show results, clear any previous ones
        searchbarPlugins.reset("fullTextPlaces");
      }
    }, 200),
  });
})();
