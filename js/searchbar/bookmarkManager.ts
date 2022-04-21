// @ts-check

import { searchbar } from "./searchbar";
import searchbarPlugins from "./searchbarPlugins";
import * as searchbarUtils from "./searchbarUtils";
const bangsPlugin = require("./bangsPlugin.js");
import { places } from "../places/places";
const urlParser = require("../util/urlParser.js");
const formatRelativeDate = require("../util/relativeDate.js");

import tabEditor from "../navbar/tabEditor";
const bookmarkEditor = require("./bookmarkEditor.js");

import { l } from "../../localization";
import { tasks } from "../tabState";

const maxTagSuggestions = 12;

function parseBookmarkSearch(text) {
  const tags = text
    .split(/\s/g)
    .filter((word) => word.startsWith("#") && word.length > 1)
    .map((t) => t.substring(1));

  let newText = text;
  tags.forEach((word) => {
    newText = newText.replace("#" + word, "");
  });
  newText = newText.trim();
  return {
    tags,
    text: newText,
  };
}

function itemMatchesTags(item, tags) {
  for (var i = 0; i < tags.length; i++) {
    if (!item.tags.filter((t) => t.startsWith(tags[i])).length) {
      return false;
    }
  }
  return true;
}

function showBookmarkEditor(url, item) {
  bookmarkEditor.show(url, item, (newBookmark) => {
    if (newBookmark) {
      if (item.parentNode) {
        // item could be detached from the DOM if the searchbar is closed
        item.parentNode.replaceChild(
          searchbarUtils.createItem(getBookmarkListItemData(newBookmark)),
          item
        );
      }
    } else {
      places.deleteHistory(url);
      item.remove();
    }
  });
}

function getBookmarkListItemData(result, focus?: any) {
  return {
    title: result.title,
    secondaryText: urlParser.getSourceURL(result.url),
    fakeFocus: focus,
    click: (e) => {
      searchbar.openURL(result.url, e);
    },
    classList: ["bookmark-item"],
    delete: () => {
      places.deleteHistory(result.url);
    },
    button: {
      icon: "carbon:edit",
      fn: (el) => {
        showBookmarkEditor(result.url, el.parentNode);
      },
    },
  };
}

class BookmarkManager {
  public showBookmarks(text, input, event) {
    const container = searchbarPlugins.getContainer(
      "bangs"
    ) as HTMLInputElement;

    const lazyList = searchbarUtils.createLazyList(
      container.parentNode as HTMLElement
    );

    const parsedText = parseBookmarkSearch(text);

    var displayedURLset = [];
    places.searchPlaces(
      parsedText.text,
      (results) => {
        places.autocompleteTags(parsedText.tags, (suggestedTags) => {
          searchbarPlugins.reset("bangs");

          const tagBar = document.createElement("div");
          tagBar.id = "bookmark-tag-bar";
          container.appendChild(tagBar);

          parsedText.tags.forEach((tag) => {
            tagBar.appendChild(
              bookmarkEditor.getTagElement(
                tag,
                true,
                () => {
                  tabEditor.show(
                    tasks.tabs.getSelected(),
                    "!bookmarks " + text.replace("#" + tag, "").trim()
                  );
                },
                { autoRemove: false }
              )
            );
          });
          // it doesn't make sense to display tag suggestions if there's a search, since the suggestions are generated without taking the search into account
          if (!parsedText.text) {
            suggestedTags.forEach((suggestion, index) => {
              const el = bookmarkEditor.getTagElement(suggestion, false, () => {
                const needsSpace =
                  text.slice(-1) !== " " && text.slice(-1) !== "";
                tabEditor.show(
                  tasks.tabs.getSelected(),
                  "!bookmarks " +
                    text +
                    (needsSpace ? " #" : "#") +
                    suggestion +
                    " "
                );
              });
              if (index >= maxTagSuggestions) {
                el.classList.add("overflowing");
              }
              tagBar.appendChild(el);
            });

            if (suggestedTags.length > maxTagSuggestions) {
              var expandEl = bookmarkEditor.getTagElement(
                "\u2026",
                false,
                function () {
                  tagBar.classList.add("expanded");
                  expandEl.remove();
                }
              );
              tagBar.appendChild(expandEl);
            }
          }

          var lastRelativeDate = ""; // used to generate headings

          results
            .filter((result) => {
              if (itemMatchesTags(result, parsedText.tags)) {
                return true;
              } else {
                return false;
              }
            })
            .sort((a, b) => {
              // order by last visit
              return b.lastVisit - a.lastVisit;
            })
            .forEach((result, index) => {
              displayedURLset.push(result.url);

              var thisRelativeDate = formatRelativeDate(result.lastVisit);
              if (thisRelativeDate !== lastRelativeDate) {
                searchbarPlugins.addHeading("bangs", {
                  text: thisRelativeDate,
                });
                lastRelativeDate = thisRelativeDate;
              }

              var itemData = getBookmarkListItemData(
                result,
                index === 0 && parsedText.text
              );
              var placeholder = lazyList.createPlaceholder();
              container.appendChild(placeholder);
              lazyList.lazyRenderItem(placeholder, itemData);
            });

          if (text === "" && results.length < 3) {
            container.appendChild(
              searchbarUtils.createItem({
                title: l("importBookmarks"),
                icon: "carbon:upload",
                click: () => {
                  searchbar.openURL("!importbookmarks", null);
                },
              })
            );
          }

          if (parsedText.tags.length > 0) {
            places.getSuggestedItemsForTags(
              parsedText.tags,
              function (suggestedResults) {
                suggestedResults = suggestedResults.filter(
                  (res) => !displayedURLset.includes(res.url)
                );
                if (suggestedResults.length === 0) {
                  return;
                }
                searchbarPlugins.addHeading("bangs", {
                  text: l("bookmarksSimilarItems"),
                });
                suggestedResults
                  .sort(function (a, b) {
                    // order by last visit
                    return b.lastVisit - a.lastVisit;
                  })
                  .forEach(function (result, index) {
                    var item = searchbarUtils.createItem(
                      getBookmarkListItemData(result, false)
                    );
                    container.appendChild(item);
                  });
              }
            );
          }
        });
      },
      {
        searchBookmarks: true,
        limit: Infinity,
      }
    );
  }

  constructor() {
    bangsPlugin.registerCustomBang({
      phrase: "!bookmarks",
      snippet: l("searchBookmarks"),
      isAction: false,
      showSuggestions: (text: string, input: HTMLInputElement, event: any) =>
        this.showBookmarks(text, input, event),
      fn: (text) => {
        const parsedText = parseBookmarkSearch(text);
        if (!parsedText.text) {
          return;
        }
        places.searchPlaces(
          parsedText.text,
          (results) => {
            results = results
              .filter((r) => itemMatchesTags(r, parsedText.tags))
              .sort((a, b) => b.lastVisit - a.lastVisit);

            if (results.length !== 0) {
              searchbar.openURL(results[0].url, null);
            }
          },
          { searchBookmarks: true }
        );
      },
    });
  }
}

export const bookmarkManager = new BookmarkManager();
