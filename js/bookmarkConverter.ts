// @ts-check

/* Handles importing / exporting bookmarks to HTML */

import fs from "fs";
import path from "path";
import { getConfig } from "./util/utils";
import settings from "./util/settings/settings";

import { places } from "./places/places";
var urlParser = require("./util/urlParser.js");

class BookmarkConverter {
  public import(data) {
    const tree = new DOMParser().parseFromString(data, "text/html");
    const bookmarks = Array.from(tree.getElementsByTagName("a"));
    bookmarks.forEach((bookmark) => {
      var url = bookmark.getAttribute("href");
      if (
        !url ||
        (!url.startsWith("http:") &&
          !url.startsWith("https:") &&
          !url.startsWith("file:"))
      ) {
        return;
      }

      const data = {
        title: bookmark.textContent,
        isBookmarked: true,
        tags: [],
        lastVisit: Date.now(),
      };

      try {
        const last = parseInt(bookmark.getAttribute("add_date")!) * 1000;
        if (!isNaN(last)) {
          data.lastVisit = last;
        }
      } catch (e) {}

      let parent = bookmark.parentElement as HTMLElement;
      while (parent != null) {
        if (parent.children[0] && parent.children[0].tagName === "H3") {
          data.tags.push(parent.children[0].textContent.replace(/\s/g, "-"));
          break;
        }
        parent = parent.parentElement as HTMLElement;
      }
      if (bookmark.getAttribute("tags")) {
        data.tags = data.tags.concat(
          bookmark?.getAttribute("tags")?.split(",")
        );
      }
      places.updateItem(url, data, () => {});
    });
  }

  public exportAll() {
    return new Promise((resolve, reject) => {
      // build the tree structure
      const root = document.createElement("body");
      const heading = document.createElement("h1");
      heading.textContent = "Bookmarks";
      root.appendChild(heading);
      const innerRoot = document.createElement("dl");
      root.appendChild(innerRoot);

      const folderRoot = document.createElement("dt");
      innerRoot.appendChild(folderRoot);
      // var folderHeading = document.createElement('h3')
      // folderHeading.textContent = 'Min Bookmarks'
      // folderRoot.appendChild(folderHeading)
      const folderBookmarksList = document.createElement("dl");
      folderRoot.appendChild(folderBookmarksList);

      places.getAllItems((items) => {
        items.forEach((item) => {
          if (item.isBookmarked) {
            var itemRoot = document.createElement("dt");
            var a = document.createElement("a");
            itemRoot.appendChild(a);
            folderBookmarksList.appendChild(itemRoot);

            a.href = urlParser.getSourceURL(item.url);
            a.setAttribute("add_date", Math.round(item.lastVisit / 1000));
            if (item.tags.length > 0) {
              a.setAttribute("tags", item.tags.join(","));
            }
            a.textContent = item.title;
            // Chrome will only parse the file if it contains newlines after each bookmark
            var textSpan = document.createTextNode("\n");
            folderBookmarksList.appendChild(textSpan);
          }
        });

        resolve(root.outerHTML);
      });
    });
  }

  constructor() {
    // how often to create a new backup file
    const interval = 3 * 24 * 60 * 60 * 1000;
    // min size in bytes for a backup
    // This is necessary because after the database is destroyed, the browser will launch with no bookmarks
    // and the bookmarks backup shouldn't be overwritten in that case
    const minSize = 512;

    const checkAndExport = () => {
      if (
        !settings.get("lastBookmarksBackup") ||
        Date.now() - settings.get("lastBookmarksBackup") > interval
      ) {
        this.exportAll()
          .then((res: any) => {
            if (res.length > minSize) {
              fs.writeFile(
                path.join(getConfig("user-data-path"), "bookmarksBackup.html"),
                res,
                { encoding: "utf-8" },
                function (err) {
                  if (err) {
                    console.warn(err);
                  }
                }
              );
              settings.set("lastBookmarksBackup", Date.now());
            }
          })
          .catch((e) => console.warn("error generating bookmarks backup", e));
      }
    };

    setTimeout(checkAndExport, 10000);
    setInterval(checkAndExport, interval / 3);
  }
}

export default new BookmarkConverter();
