import { ipcRenderer as ipc } from "electron";

if (navigator.maxTouchPoints > 0) {
  document.body.classList.add("touch");
}

/* add classes so that the window state can be used in CSS */
ipc.on("enter-full-screen", () => {
  document.body.classList.add("fullscreen");
});

ipc.on("leave-full-screen", () => {
  document.body.classList.remove("fullscreen");
});

ipc.on("maximize", () => {
  document.body.classList.add("maximized");
});

ipc.on("unmaximize", () => {
  document.body.classList.remove("maximized");
});

/* prevent a click event from firing after dragging the window */

window.addEventListener("load", () => {
  let isMouseDown = false;
  let isDragging = false;
  let distance = 0;

  document.body.addEventListener("mousedown", () => {
    isMouseDown = true;
    isDragging = false;
    distance = 0;
  });

  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  const dragHandles = document.getElementsByClassName("windowDragHandle");

  for (let i = 0; i < dragHandles.length; i++) {
    dragHandles[i].addEventListener("mousemove", (e) => {
      if (isMouseDown) {
        isDragging = true;
        distance +=
          Math.abs((e as MouseEvent).movementX) +
          Math.abs((e as MouseEvent).movementY);
      }
    });
  }

  document.body.addEventListener(
    "click",
    (e) => {
      if (isDragging && distance >= 10.0) {
        e.stopImmediatePropagation();
        isDragging = false;
      }
    },
    true
  );
});

import "./tabState";
import "./util/settings/settings";
import "./util/theme/renderer";

import "./navbar/addTabButton";
import "./navbar/tabActivity";
import "./navbar/tabColor.js";
import "./navbar/navigationButtons";

import "./downloadManager";
import "./webviewMenu";
import "./contextMenu";
import "./menuRenderer";
import "./defaultKeybindings";
import "./pdfViewer";
import "./passwordManager/passwordManager";
import "./passwordManager/passwordCapture";
import "./passwordManager/passwordViewer";
import "./taskOverlay/taskOverlay";
import session from "./sessionRestore";
import "./bookmarkConverter";
import "./newTabPage";

// default searchbar plugins

import "./searchbar/searchbar";
import "./searchbar/placesPlugin";
import "./searchbar/instantAnswerPlugin";
import "./searchbar/developmentModeNotification";
import "./searchbar/openTabsPlugin";
import "./searchbar/bangsPlugin";
import "./searchbar/customBangs";
import "./searchbar/searchSuggestionsPlugin";
import "./searchbar/placeSuggestionsPlugin";
import "./searchbar/restoreTaskPlugin";
import "./searchbar/bookmarkManager";
import "./searchbar/historyViewer";
import "./searchbar/shortcutButtons";

// once everything's loaded, start the session
session.restore();


// import "./ui"