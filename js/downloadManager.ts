// @ts-check

import { ipcRenderer as ipc, shell } from "electron";

import webviews from "./webviews"
const remoteMenu = require("./remoteMenuRenderer.js");
const { l } = require("../localization");

function getFileSizeString(bytes) {
  const prefixes = ["B", "KB", "MB", "GB", "TB", "PB"];

  let size = bytes;
  let prefixIndex = 0;

  while (size > 900) {
    // prefer "0.9 KB" to "949 bytes"
    size /= 1024;
    prefixIndex++;
  }

  return Math.round(size * 10) / 10 + " " + prefixes[prefixIndex];
}

interface DownloadItem {
  name: string
  status: string
  path: string
  size: {
    total: number
    received: number
  }
}

class DownloadManager {
  public isShown = false
  public bar = document.getElementById("download-bar") as HTMLDivElement
  public container = document.getElementById("download-container")
  public closeButton = document.getElementById("download-close-button")
  public height = 40
  public lastDownloadCompleted: number | null = null
  public downloadItems: Record<string, DownloadItem> = {}
  public downloadBarElements = {}

  public show() { 
    if (!this.isShown) {
      this.isShown = true;
      this.bar.hidden = false;
      webviews.adjustMargin([0, 0, this.height, 0]);
    }
  }

  public hide() {
    if (this.isShown) {
      this.isShown = false;
      this.bar.hidden = true;
      webviews.adjustMargin([0, 0, this.height * -1, 0]);

      // remove all completed or failed items
      for (const item in this.downloadItems) {
        if (this.downloadItems[item].status !== "progressing") {
          this.removeItem(item);
        }
      }
    }
  }

  public removeItem(path) {
    if (this.downloadBarElements[path]) {
      this.downloadBarElements[path].container.remove();
    }

    delete this.downloadBarElements[path];
    delete this.downloadItems[path];

    if (Object.keys(this.downloadItems).length === 0) {
      this.hide();
    }
  }

  public openFolder(path) {
    shell.showItemInFolder(path);
  }

  public onItemClicked(path) {
    if (this.downloadItems[path].status === "completed") {
      shell.openPath(path);
      // provide a bit of time for the file to open before the download bar disappears
      setTimeout( () => {
        this.removeItem(path);
      }, 100);
    }
  }
  
  public onItemDragged(path) {
    ipc.invoke("startFileDrag", path);
  }

  public onDownloadCompleted() {
    this.lastDownloadCompleted = Date.now();
    setTimeout(() => {
      if (
        Date.now() - this.lastDownloadCompleted! >= 120000 &&
        Object.values(this.downloadItems).filter(
          (i) => i.status === "progressing"
        ).length === 0
      ) {
        this.hide();
      }
    }, 120 * 1000);
  }

  public createItem(downloadItem) {
    const container = document.createElement("div");
    container.className = "download-item";
    container.setAttribute("role", "listitem");
    container.setAttribute("draggable", "true");

    const title = document.createElement("div");
    title.className = "download-title";
    title.textContent = downloadItem.name;
    container.appendChild(title);

    const infoBox = document.createElement("div");
    infoBox.className = "download-info";
    container.appendChild(infoBox);

    const detailedInfoBox = document.createElement("div");
    detailedInfoBox.className = "download-info detailed";
    container.appendChild(detailedInfoBox);

    const progress = document.createElement("div");
    progress.className = "download-progress";
    container.appendChild(progress);

    const dropdown = document.createElement("button");
    dropdown.className = "download-action-button i carbon:chevron-down";
    container.appendChild(dropdown);

    const openFolder = document.createElement("button");
    openFolder.className = "download-action-button i carbon:folder";
    openFolder.hidden = true;
    container.appendChild(openFolder);

    container.addEventListener("click",  () => {
      this.onItemClicked(downloadItem.path);
    });

    container.addEventListener("dragstart",  (e) => {
      e.preventDefault();
      this.onItemDragged(downloadItem.path);
    });

    dropdown.addEventListener("click",  (e) => {
      e.stopPropagation();
      var template = [
        [
          {
            label: l("downloadCancel"),
            click: () => {
              ipc.send("cancelDownload", downloadItem.path);
              this.removeItem(downloadItem.path);
            },
          },
        ],
      ];

      remoteMenu.open(
        template,
        Math.round(dropdown.getBoundingClientRect().left),
        Math.round(dropdown.getBoundingClientRect().top - 15)
      );
    });

    openFolder.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openFolder(downloadItem.path);
      this.removeItem(downloadItem.path);
    });

    this.container?.appendChild(container);
    this.downloadBarElements[downloadItem.path] = {
      container,
      title,
      infoBox,
      detailedInfoBox,
      progress,
      dropdown,
      openFolder,
    };
  }

  public updateItem(downloadItem) {
    const elements = this.downloadBarElements[downloadItem.path];

    if (downloadItem.status === "completed") {
      elements.container.classList.remove("loading");
      elements.container.classList.add("completed");
      elements.progress.hidden = true;
      elements.dropdown.hidden = true;
      elements.openFolder.hidden = false;
      elements.infoBox.textContent = l("downloadStateCompleted");
      elements.detailedInfoBox.textContent = l("downloadStateCompleted");
    } else if (downloadItem.status === "interrupted") {
      elements.container.classList.remove("loading");
      elements.container.classList.remove("completed");
      elements.progress.hidden = true;
      elements.dropdown.hidden = true;
      elements.openFolder.hidden = true;
      elements.infoBox.textContent = l("downloadStateFailed");
      elements.detailedInfoBox.textContent = l("downloadStateFailed");
    } else {
      elements.container.classList.add("loading");
      elements.container.classList.remove("completed");
      elements.progress.hidden = false;
      elements.dropdown.hidden = false;
      elements.openFolder.hidden = true;
      elements.infoBox.textContent = getFileSizeString(downloadItem.size.total);
      elements.detailedInfoBox.textContent =
        getFileSizeString(downloadItem.size.received) +
        " / " +
        getFileSizeString(downloadItem.size.total);

      // the progress bar has a minimum width so that it's visible even if there's 0 download progress
      const adjustedProgress =
        0.025 + (downloadItem.size.received / downloadItem.size.total) * 0.975;
      elements.progress.style.transform = "scaleX(" + adjustedProgress + ")";
    }
  }

  constructor() {
    this.closeButton?.addEventListener("click", () => {
      this.hide();
    });

    ipc.on("download-info", (e, info) => {
      if (!info.path) {
        // download save location hasn't been chosen yet
        return;
      }

      if (info.status === "cancelled") {
        this.removeItem(info.path);
        return;
      }

      if (info.status === "completed") {
        this.onDownloadCompleted();
      }

      if (!this.downloadItems[info.path]) {
        this.show();
        this.createItem(info);
      }
      this.updateItem(info);

      this.downloadItems[info.path] = info;
    });
  }
};

export default new DownloadManager()
