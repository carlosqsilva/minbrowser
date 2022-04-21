import { ipcRenderer } from "electron";
import webviews from "../webviews";

class PermissionRequests {
  public requests = [];
  public listeners = [];
  public grantPermission(permissionId: string) {
    this.requests.forEach(function (request) {
      if (request.permissionId && request.permissionId === permissionId) {
        ipcRenderer.send("permissionGranted", permissionId);
      }
    });
  }

  public getIcons(request) {
    if (request.permission === "notifications") {
      return ["carbon:chat"];
    } else if (request.permission === "media") {
      var mediaIcons = {
        video: "carbon:video",
        audio: "carbon:microphone",
      };
      return request.details.mediaTypes.map((t) => mediaIcons[t]);
    }
  }

  public getButtons(tabId: string) {
    const buttons = [];
    this.requests.forEach((request) => {
      if (request.tabId === tabId) {
        const button = document.createElement("button");
        button.className = "tab-icon permission-request-icon";
        if (request.granted) {
          button.classList.add("active");
        }
        this.getIcons(request).forEach((icon) => {
          const el = document.createElement("i");
          el.className = "i " + icon;
          button.appendChild(el);
        });
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          if (request.granted) {
            webviews.callAsync(tabId, "reload");
          } else {
            this.grantPermission(request.permissionId);
            button.classList.add("active");
          }
        });
        buttons.push(button);
      }
    });
    return buttons;
  }

  public onChange(listener) {
    this.listeners.push(listener);
  }

  constructor() {
    ipcRenderer.on("updatePermissions", (e, data) => {
      const oldData = this.requests;
      this.requests = data;
      oldData.forEach((req) => {
        this.listeners.forEach((listener) => listener(req.tabId));
      });
      this.requests.forEach((req) => {
        this.listeners.forEach((listener) => listener(req.tabId));
      });
    });
  }
}

export const permissionRequests = new PermissionRequests();
