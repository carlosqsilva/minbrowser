import debounce from "lodash.debounce";
import * as searchbar from "../searchbar";
import * as searchbarUtils from "../shared/searchbarUtils";
import * as searchbarAutocomplete from "../shared/autocomplete";
import { urlParser } from "../shared/urlParser";

import { places } from "../places/places";
import { searchEngine } from "../searchEngine/renderer";

let currentResponseSent = 0;

enum PlacesPlugin {
  Places = "places",
  FullTextPlaces = "fullTextPlaces",
}

function showSearchbarPlaceResults(
  text: string,
  input: HTMLInputElement,
  event,
  pluginName = PlacesPlugin.Places
) {
  const responseSent = Date.now();

  let searchFn, resultCount;
  if (pluginName === PlacesPlugin.FullTextPlaces) {
    searchFn = (text: string, cb: any) => places.searchPlacesFullText(text, cb);
    resultCount = 4 - searchbar.getResultCount("places");
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

    searchbar.resetPlugin(pluginName);

    results = results.slice(0, resultCount);

    results.forEach((result, index) => {
      let didAutocompleteResult = false;

      const searchQuery = searchEngine.getSearch(result.url);

      if (canAutocomplete) {
        // if the query is autocompleted, pressing enter will search for the result using the current search engine,
        // so only pages from the current engine should be autocompleted
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
          const autocompletionType = searchbarAutocomplete.autocompleteURL(
            input,
            result.url
          );

          if (autocompletionType !== -1) {
            canAutocomplete = false;
          }

          if (autocompletionType === 0) {
            // the domain was autocompleted, show a domain result item
            const domain = new URL(result.url).hostname;

            searchbar.setTopAnswer(pluginName, {
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
        delete: () => {
          places.deleteHistory(result.url);
        },
        icon: "carbon:wikis",
      } as searchbar.Result;

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
        searchbar.setTopAnswer(pluginName, data);
      } else {
        searchbar.addResult(pluginName, data);
      }
    });
  });
}

export const placesPlugin: searchbar.Plugin = {
  name: PlacesPlugin.Places,
  trigger: (text: string) => !!text && text.indexOf("!") !== 0,
  showResults: showSearchbarPlaceResults,
};

export const fullTextPlaces: searchbar.Plugin = {
  name: PlacesPlugin.FullTextPlaces,
  trigger: (text: string) => !!text && text.indexOf("!") !== 0,
  showResults: debounce((text, input, event) => {
    if (searchbar.getResultCount("places") < 4) {
      showSearchbarPlaceResults(
        text,
        input,
        event,
        PlacesPlugin.FullTextPlaces
      );
    } else {
      // can't show results, clear any previous ones
      searchbar.resetPlugin(PlacesPlugin.FullTextPlaces);
    }
  }, 200),
};
