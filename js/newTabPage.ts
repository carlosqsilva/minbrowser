// @ts-check

import fs from "fs";
import path from "path";
import { ipcRenderer as ipc } from "electron";

const newTabPage = {
  background: document.getElementById("ntp-background") as HTMLImageElement,
  hasBackground: false,
  picker: document.getElementById("ntp-image-picker") as HTMLButtonElement,
  deleteBackground: document.getElementById("ntp-image-remove") as HTMLElement,
  imagePath: path.join(window.globalArgs["user-data-path"], "newTabBackground"),
  reloadBackground: function () {
    newTabPage.background.src = newTabPage.imagePath + "?t=" + Date.now();
    function onLoad() {
      newTabPage.background.hidden = false;
      newTabPage.hasBackground = true;
      document.body.classList.add("ntp-has-background");
      newTabPage.background.removeEventListener("load", onLoad);

      newTabPage.deleteBackground.hidden = false;
    }
    function onError() {
      newTabPage.background.hidden = true;
      newTabPage.hasBackground = false;
      document.body.classList.remove("ntp-has-background");
      newTabPage.background.removeEventListener("error", onError);

      newTabPage.deleteBackground.hidden = true;
    }
    newTabPage.background.addEventListener("load", onLoad);
    newTabPage.background.addEventListener("error", onError);
  },
  initialize: function () {
    newTabPage.reloadBackground();

    newTabPage.picker.addEventListener("click", async function () {
      const [filePath] = await ipc.invoke("showOpenDialog", {
        filters: [
          {
            name: "Image files",
            extensions: ["jpg", "jpeg", "png", "gif", "webp"],
          },
        ],
      });

      if (!filePath) {
        return;
      }

      await fs.promises.copyFile(filePath, newTabPage.imagePath);
      newTabPage.reloadBackground();
    });

    newTabPage.deleteBackground.addEventListener("click", async function () {
      await fs.promises.unlink(newTabPage.imagePath);
      newTabPage.reloadBackground();
    });
  },
};

module.exports = newTabPage;
