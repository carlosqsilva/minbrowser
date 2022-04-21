// @ts-check

import { places } from "../places/places";
const bookmarkEditor = require("../searchbar/bookmarkEditor.js");
import { searchbar } from "../searchbar/searchbar";
import searchbarPlugins from "../searchbar/searchbarPlugins";

import { tasks } from "../tabState";
import { l } from "../../localization";

const bookmarkStar = {
  create: function () {
    const star = document.createElement("button");
    star.className = "tab-editor-button bookmarks-button i carbon:star";
    star.setAttribute("aria-pressed", String(false));
    star.setAttribute("title", l("addBookmark"));
    star.setAttribute("aria-label", l("addBookmark"));

    star.addEventListener("click", function (e) {
      bookmarkStar.onClick(star);
    });

    return star;
  },
  onClick: function (star) {
    var tabId = star.getAttribute("data-tab");

    searchbarPlugins.clearAll();

    places.updateItem(
      tasks.tabs.get(tabId).url,
      {
        isBookmarked: true,
        title: tasks.tabs.get(tabId).title, // if this page is open in a private tab, the title may not be saved already, so it needs to be included here
      },
      function () {
        star.classList.remove("carbon:star");
        star.classList.add("carbon:star-filled");
        star.setAttribute("aria-pressed", true);

        var editorInsertionPoint = document.createElement("div");
        searchbarPlugins
          .getContainer("simpleBookmarkTagInput")
          .appendChild(editorInsertionPoint);
        bookmarkEditor.show(
          tasks.tabs.get(tasks.tabs.getSelected()).url,
          editorInsertionPoint,
          function (newBookmark) {
            if (!newBookmark) {
              // bookmark was deleted
              star.classList.add("carbon:star");
              star.classList.remove("carbon:star-filled");
              star.setAttribute("aria-pressed", false);
              searchbar.showResults("");
              searchbar.associatedInput.focus();
            }
          },
          { simplified: true, autoFocus: true }
        );
      }
    );
  },
  update: function (tabId, star) {
    star.setAttribute("data-tab", tabId);
    const currentURL = tasks.tabs.get(tabId).url;

    if (!currentURL) {
      // no url, can't be bookmarked
      star.hidden = true;
    } else {
      star.hidden = false;
    }

    // check if the page is bookmarked or not, and update the star to match

    places.getItem(currentURL, function (item) {
      if (item && item.isBookmarked) {
        star.classList.remove("carbon:star");
        star.classList.add("carbon:star-filled");
        star.setAttribute("aria-pressed", true);
      } else {
        star.classList.add("carbon:star");
        star.classList.remove("carbon:star-filled");
        star.setAttribute("aria-pressed", false);
      }
    });
  },
};

searchbarPlugins.register("simpleBookmarkTagInput", {
  index: 0,
});

module.exports = bookmarkStar;
