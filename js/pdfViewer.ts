// @ts-check

/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

import { ipcRenderer as ipc } from "electron";

import webviews from "./webviews";
import { urlParser } from "./util/urlParser";
import { tasks } from "./tabState";

class PDFViewer {
  static url = {
    base: urlParser.getFileURL(__dirname + "/pages/pdfViewer/index.html"),
    queryString: "?url=%l",
  };

  public isPDFViewer(tabId) {
    return tasks.tabs.get(tabId).url.startsWith(PDFViewer.url.base);
  }

  public printPDF(viewerTabId) {
    if (!this.isPDFViewer(viewerTabId)) {
      throw new Error("attempting to print in a tab that isn't a PDF viewer");
    }

    webviews.callAsync(
      tasks.tabs.getSelected()!,
      "executeJavaScript",
      "parentProcessActions.printPDF()"
    );
  }

  public savePDF(viewerTabId) {
    if (!this.isPDFViewer(viewerTabId)) {
      throw new Error("attempting to save in a tab that isn't a PDF viewer");
    }

    webviews.callAsync(
      tasks.tabs.getSelected()!,
      "executeJavaScript",
      "parentProcessActions.downloadPDF()"
    );
  }

  public startFindInPage(viewerTabId) {
    if (!this.isPDFViewer(viewerTabId)) {
      throw new Error(
        "attempting to call startFindInPage in a tab that isn't a PDF viewer"
      );
    }

    webviews.callAsync(
      tasks.tabs.getSelected()!,
      "executeJavaScript",
      "parentProcessActions.startFindInPage()"
    );
  }

  public endFindInPage(viewerTabId) {
    if (!this.isPDFViewer(viewerTabId)) {
      throw new Error(
        "attempting to call endFindInPage in a tab that isn't a PDF viewer"
      );
    }

    webviews.callAsync(
      tasks.tabs.getSelected()!,
      "executeJavaScript",
      "parentProcessActions.endFindInPage()"
    );
  }

  public handlePDFOpenEvent(event, data) {
    if (!data.tabId) {
      const matchingTabs = tasks.tabs
        .get()
        .filter((t) => t.url === data.url)
        .sort((a, b) => b.lastActivity - a.lastActivity);

      if (matchingTabs[0]) {
        data.tabId = matchingTabs[0].id;
      }
    }

    if (!data.tabId) {
      console.warn(
        "missing tab ID for PDF",
        data.url,
        tasks.tabs.get().map((t) => t.url)
      );
      return;
    }

    const PDFurl =
      PDFViewer.url.base +
      PDFViewer.url.queryString.replace("%l", encodeURIComponent(data.url));

    webviews.update(data.tabId, PDFurl);
  }

  constructor() {
    ipc.on("openPDF", this.handlePDFOpenEvent.bind(this));
  }
}

export const pdfViewer = new PDFViewer();
