/* Handles messages that get sent from the menu bar in the main process */

import { ipcRenderer as ipc } from "electron";

import * as browserUI from "./browserUI";
import webviews, { zoomWebviewBy } from "./webviewUtils";
import { searchStart } from "./pageSearch";
import { createNewTab, currentTab } from "./store";

(() => {
  ipc.on("zoomIn", () => {
    zoomWebviewBy(currentTab()?.id, 0.2);
  });

  ipc.on("zoomOut", () => {
    zoomWebviewBy(currentTab()?.id, -0.2);
  });

  ipc.on("zoomReset", () => {
    webviews.callAsync(currentTab()?.id, "zoomFactor", 1.0);
  });

  ipc.on("inspectPage", () => {
    webviews.callAsync(currentTab()?.id, "toggleDevTools");
  });

  ipc.on("findInPage", () => {
    searchStart();
  });

  ipc.on("addTab", (e, data) => {
    const newTab = createNewTab({
      url: data.url || "",
    });

    browserUI.addTab(newTab, {
      enterEditMode: !data.url, // only enter edit mode if the new tab is empty
    });
  });

  ipc.on("addPrivateTab", () => {
    browserUI.addTab(
      createNewTab({
        private: true,
      })
    );
  });

  ipc.on("goBack", () => {
    webviews.callAsync(currentTab()?.id, "goBack");
  });

  ipc.on("goForward", () => {
    webviews.callAsync(currentTab()?.id, "goForward");
  });
})();
