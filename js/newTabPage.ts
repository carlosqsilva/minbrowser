// @ts-check

import fs from "fs";
import path from "path";
import { ipcRenderer as ipc } from "electron";
import { getConfig } from "./util/utils";

class NewTabPage {
  public background = document.getElementById("ntp-background") as HTMLImageElement
  public hasBackground = false
  public picker = document.getElementById("ntp-image-picker") as HTMLButtonElement
  public deleteBackground = document.getElementById("ntp-image-remove") as HTMLElement
  public imagePath = path.join(getConfig("user-data-path"), "newTabBackground")

  public reloadBackground() {
    this.background.src = this.imagePath + "?t=" + Date.now();
    
    const onLoad = () => {
      this.background.hidden = false;
      this.hasBackground = true;
      document.body.classList.add("ntp-has-background");
      this.background.removeEventListener("load", onLoad);
      this.deleteBackground.hidden = false;
    }

    const onError = () => {
      this.background.hidden = true;
      this.hasBackground = false;
      document.body.classList.remove("ntp-has-background");
      this.background.removeEventListener("error", onError);
      this.deleteBackground.hidden = true;
    }

    this.background.addEventListener("load", onLoad);
    this.background.addEventListener("error", onError);
  }

  constructor() {
    this.reloadBackground();

    this.picker.addEventListener("click", async () => {
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

      await fs.promises.copyFile(filePath, this.imagePath);
      this.reloadBackground();
    });

    this.deleteBackground.addEventListener("click", async () => {
      await fs.promises.unlink(this.imagePath);
      this.reloadBackground();
    });
  }
};

export default new NewTabPage();
