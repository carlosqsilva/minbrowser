import { searchbar } from "./searchbar";
import searchbarPlugins from "./searchbarPlugins";
import * as searchbarUtils from "./searchbarUtils";
import { registerCustomBang } from "./bangsPlugin";
import { places } from "../places/places";
const urlParser = require("../util/urlParser.js");
const formatRelativeDate = require("../util/relativeDate.js");

const { ipcRenderer: ipc } = require("electron");
const { l } = require("../../localization");

(() => {
  registerCustomBang({
    phrase: "!history",
    snippet: l("searchHistory"),
    isAction: false,
    showSuggestions: (text, input, event) => {
      places.searchPlaces(
        text,
        (results) => {
          searchbarPlugins.reset("bangs");

          const container = searchbarPlugins.getContainer("bangs");

          // show clear button

          if (text === "" && results.length > 0) {
            const clearButton = document.createElement("button");
            clearButton.className = "searchbar-floating-button";
            clearButton.textContent = l("clearHistory");
            container?.appendChild(clearButton);

            clearButton.addEventListener("click", () => {
              if (confirm(l("clearHistoryConfirmation"))) {
                places.deleteAllHistory();
                ipc.invoke("clearStorageData");

                // hacky way to refresh the list
                // TODO make a better api for this
                setTimeout(() => {
                  searchbarPlugins.run("!history " + text, input, null);
                }, 200);
              }
            });
          }

          // show results

          const lazyList = searchbarUtils.createLazyList(
            container?.parentNode as HTMLElement
          );

          let lastRelativeDate = ""; // used to generate headings

          results
            .sort((a, b) => b.lastVisit - a.lastVisit)
            .slice(0, 1000)
            .forEach((result, index) => {
              const thisRelativeDate = formatRelativeDate(result.lastVisit);
              if (thisRelativeDate !== lastRelativeDate) {
                searchbarPlugins.addHeading("bangs", {
                  text: thisRelativeDate,
                });
                lastRelativeDate = thisRelativeDate;
              }

              const data = {
                title: result.title,
                secondaryText: urlParser.getSourceURL(result.url),
                fakeFocus: index === 0 && text,
                icon: result.isBookmarked ? "carbon:star" : "",
                click: (e) => {
                  searchbar.openURL(result.url, e);
                },
                delete: () => {
                  places.deleteHistory(result.url);
                },
                showDeleteButton: true,
              };
              const placeholder = lazyList.createPlaceholder();
              container?.appendChild(placeholder);
              lazyList.lazyRenderItem(placeholder, data);
            });
        },
        { limit: Infinity }
      );
    },
    fn: (text) => {
      if (!text) {
        return;
      }
      places.searchPlaces(
        text,
        (results) => {
          if (results.length !== 0) {
            results = results.sort((a, b) => b.lastVisit - a.lastVisit);
            searchbar.openURL(results[0].url, null);
          }
        },
        { limit: Infinity }
      );
    },
  });
})();
