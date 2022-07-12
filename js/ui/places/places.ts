import { unwrap } from "solid-js/store";
import webviews from "../webviewUtils";
import { searchEngine } from "../searchEngine/renderer";
import { urlParser } from "../shared/urlParser";
import { getTab } from "../store";
import { Place } from "../shared/database";

class Places {
  public savePage(tabId: string, extractedText: string) {
    /* this prevents pages that are immediately left from being saved to history, 
     * and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct). 
     */
    setTimeout(() => {
      const tab = unwrap(getTab(tabId));

      if (tab) {
        const data = {
          url: urlParser.getSourceURL(tab.url), // for PDF viewer and reader mode, save the original page URL and not the viewer URL
          title: tab.title,
          color: tab.backgroundColor,
          extractedText: extractedText,
        };

        this.worker?.postMessage({
          action: "updatePlace",
          pageData: data,
          flags: {
            isNewVisit: true,
          },
        });
      }
    }, 500);
  }

  public receiveHistoryData(tabId: string, args) {
    // called when js/preload/textExtractor.js returns the page's text content

    const tab = getTab(tabId);
    const data = args[0];

    if (tab.url.startsWith("data:") || tab.url.length > 500) {
      /*
      very large URLs cause performance issues. In particular:
      * they can cause the database to grow abnormally large, which increases memory usage and startup time
      * they can cause the browser to hang when they are displayed in search results
      To avoid this, don't save them to history
      */
      return;
    }

    /* if the page is an internal page, it normally shouldn't be saved,
    unless the page represents another page (such as the PDF viewer or reader view) */
    const isNonIndexableInternalPage =
      urlParser.isInternalURL(tab.url) &&
      urlParser.getSourceURL(tab.url) === tab.url;
    const isSearchPage = !!searchEngine.getSearch(tab.url);

    // full-text data from search results isn't useful
    if (isSearchPage) {
      data.extractedText = "";
    }

    // don't save to history if in private mode, or the page is a browser page (unless it contains the content of a normal page)
    if (tab.private === false && !isNonIndexableInternalPage) {
      this.savePage(tabId, data.extractedText);
    }
  }

  public callbacks: { id: number; fn: (...args: any) => void }[] = [];
  public addWorkerCallback(callback) {
    const callbackId = Date.now() / 1000 + Math.random();
    this.callbacks.push({ id: callbackId, fn: callback });
    return callbackId;
  }

  public runWorkerCallback(id, data) {
    for (let i = 0; i < this.callbacks.length; i++) {
      if (this.callbacks[i].id === id) {
        this.callbacks[i].fn(data);
        this.callbacks.splice(i, 1);
      }
    }
  }

  public deleteHistory(url: string) {
    this.worker?.postMessage({
      action: "deleteHistory",
      pageData: {
        url: url,
      },
    });
  }

  public deleteAllHistory() {
    this.worker?.postMessage({
      action: "deleteAllHistory",
    });
  }

  public searchPlaces(text, callback, options) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "searchPlaces",
      text: text,
      callbackId: callbackId,
      options: options,
    });
  }

  public searchPlacesFullText(text: string, callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "searchPlacesFullText",
      text: text,
      callbackId: callbackId,
    });
  }

  public getPlaceSuggestions(url: string, callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "getPlaceSuggestions",
      text: url,
      callbackId: callbackId,
    });
  }

  public onMessage(e) {
    // assumes this is from a search operation
    this.runWorkerCallback(e.data.callbackId, e.data.result);
  }

  public getItem(url: string, callback: (item: Place) => void) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "getPlace",
      pageData: {
        url: url,
      },
      callbackId: callbackId,
    });
  }

  public getAllItems(callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "getAllPlaces",
      callbackId: callbackId,
    });
  }

  public updateItem(url: string, fields, callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "updatePlace",
      pageData: {
        url: url,
        ...fields,
      },
      callbackId: callbackId,
    });
  }

  public toggleTag(url: string, tag) {
    this.getItem(url, (item) => {
      if (!item) {
        return;
      }
      if (item.tags.includes(tag)) {
        item.tags = item.tags.filter((t) => t !== tag);
      } else {
        item.tags.push(tag);
      }
      this.worker?.postMessage({
        action: "updatePlace",
        pageData: {
          url: url,
          tags: item.tags,
        },
      });
    });
  }

  public getSuggestedTags(url: string, callback: (tags: string[]) => void) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "getSuggestedTags",
      pageData: {
        url: url,
      },
      callbackId: callbackId,
    });
  }

  public getAllTagsRanked(url, callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "getAllTagsRanked",
      pageData: {
        url: url,
      },
      callbackId: callbackId,
    });
  }

  public getSuggestedItemsForTags(tags, callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "getSuggestedItemsForTags",
      pageData: {
        tags: tags,
      },
      callbackId: callbackId,
    });
  }

  public autocompleteTags(tags, callback) {
    const callbackId = this.addWorkerCallback(callback);
    this.worker?.postMessage({
      action: "autocompleteTags",
      pageData: {
        tags: tags,
      },
      callbackId: callbackId,
    });
  }

  public worker: Worker | null = null;
  constructor() {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker("./dist/placesWorker.js");
    this.worker.onmessage = (e) => this.onMessage(e);

    webviews.bindIPC("pageData", (name: string, fn: any) =>
      this.receiveHistoryData(name, fn)
    );
  }
}

export const places = new Places();
