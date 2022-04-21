// @ts-check

import webviews from "./webviews";
import * as keybindings from "./keybindings";
import { urlParser } from "./util/urlParser";

import { l } from "../localization";
import { tasks } from "./tabState";

class ReaderView {
  public readerURL = urlParser.getFileURL(__dirname + "/reader/index.html");
  public getReaderURL(url: string) {
    return readerView.readerURL + "?url=" + url;
  }
  public isReader(tabId: string) {
    return tasks.tabs.get(tabId).url.indexOf(readerView.readerURL) === 0;
  }
  public getButton(tabId: string) {
    // TODO better icon
    const button = document.createElement("button");
    button.className = "reader-button tab-icon i carbon:notebook";

    button.setAttribute("data-tab", tabId);
    button.setAttribute("role", "button");

    button.addEventListener("click", (e) => {
      e.stopPropagation();

      this.isReader(tabId) ? this.exit(tabId) : this.enter(tabId);
    });

    this.updateButton(tabId, button);

    return button;
  }

  public updateButton(tabId: string, targetButton?: HTMLButtonElement) {
    const button =
      targetButton ||
      document.querySelector(
        '.reader-button[data-tab="{id}"]'.replace("{id}", tabId)
      );
    const tab = tasks.tabs.get(tabId);

    if (this.isReader(tabId)) {
      button?.classList.add("is-reader");
      button?.setAttribute("title", l("exitReaderView"));
    } else {
      button?.classList.remove("is-reader");
      button?.setAttribute("title", l("enterReaderView"));

      if (tab.readerable) {
        button?.classList.add("can-reader");
      } else {
        button?.classList.remove("can-reader");
      }
    }
  }

  public enter(tabId: string, url?: string) {
    const newURL =
      readerView.readerURL +
      "?url=" +
      encodeURIComponent(url || tasks.tabs.get(tabId).url);
    tasks.tabs.update(tabId, { url: newURL });
    webviews.update(tabId, newURL);
  }

  public exit(tabId: string) {
    const src = urlParser.getSourceURL(tasks.tabs.get(tabId).url);
    tasks.tabs.update(tabId, { url: src });
    webviews.update(tabId, src);
  }

  public printArticle(tabId: string) {
    if (!this.isReader(tabId)) {
      throw new Error("attempting to print in a tab that isn't a reader page");
    }

    webviews.callAsync(
      tasks.tabs.getSelected()!,
      "executeJavaScript",
      "parentProcessActions.printArticle()"
    );
  }

  constructor() {
    // update the reader button on page load

    webviews.bindEvent(
      "did-start-navigation",
      (tabId, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
        if (isInPlace) {
          return;
        }

        if (isMainFrame) {
          tasks.tabs.update(tabId, {
            readerable: false, // assume the new page can't be readered, we'll get another message if it can
          });

          this.updateButton(tabId);
        }
      }
    );

    webviews.bindIPC("canReader", (tab) => {
      tasks.tabs.update(tab, {
        readerable: true,
      });

      this.updateButton(tab);
    });

    // add a keyboard shortcut to enter reader mode

    keybindings.defineShortcut("toggleReaderView", () => {
      if (this.isReader(tasks.tabs.getSelected()!)) {
        this.exit(tasks.tabs.getSelected()!);
      } else {
        this.enter(tasks.tabs.getSelected()!);
      }
    });
  }
}

const readerView = new ReaderView();

export default readerView;
