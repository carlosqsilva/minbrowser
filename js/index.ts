require("../localization");

import { ipcRenderer as ipc } from "electron";
import { platformType } from "./util/utils";

window.globalArgs = {};

for (let arg of process.argv) {
  if (arg.startsWith("--")) {
    const [key, value] = arg.split("=");
    window.globalArgs[key.replace("--", "")] = value;
  }
}

console.log(window.globalArgs);

if (platformType === "darwin") {
  document.body.classList.add("mac");
}

if (navigator.maxTouchPoints > 0) {
  document.body.classList.add("touch");
}

/* add classes so that the window state can be used in CSS */
ipc.on("enter-full-screen", function () {
  document.body.classList.add("fullscreen");
});

ipc.on("leave-full-screen", function () {
  document.body.classList.remove("fullscreen");
});

ipc.on("maximize", function () {
  document.body.classList.add("maximized");
});

ipc.on("unmaximize", function () {
  document.body.classList.remove("maximized");
});

/* prevent a click event from firing after dragging the window */

window.addEventListener("load", function () {
  let isMouseDown = false;
  let isDragging = false;
  let distance = 0;

  document.body.addEventListener("mousedown", function () {
    isMouseDown = true;
    isDragging = false;
    distance = 0;
  });

  document.body.addEventListener("mouseup", function () {
    isMouseDown = false;
  });

  const dragHandles = document.getElementsByClassName("windowDragHandle");

  for (var i = 0; i < dragHandles.length; i++) {
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
    function (e) {
      if (isDragging && distance >= 10.0) {
        e.stopImmediatePropagation();
        isDragging = false;
      }
    },
    true
  );
});

require("./tabState.js");
require("./windowControls.js").initialize();
// require('./navbar/menuButton.js').initialize() REMOVED

require("./navbar/addTabButton.js").initialize();
require("./navbar/tabActivity.js").initialize();
require("./navbar/tabColor.js").initialize();
require("./navbar/navigationButtons.js").initialize();
require("./downloadManager.js").initialize();
require("./webviewMenu.js").initialize();
require("./contextMenu.js").initialize();
require("./menuRenderer.js").initialize();
require("./defaultKeybindings.js").initialize();
require("./pdfViewer.js").initialize();
// require('./autofillSetup.js').initialize() REMOVED
require("./passwordManager/passwordManager.js").initialize();
require("./passwordManager/passwordCapture.js").initialize();
require("./passwordManager/passwordViewer.js").initialize();
require("./util/theme.js").initialize();
require("./userscripts.js").initialize();
// require('./statistics.js').initialize() TO BE REMOVED
require("./taskOverlay/taskOverlay.js").initialize();
// require('./pageTranslations.js').initialize() REMOVED
require("./sessionRestore.js").initialize();
require("./bookmarkConverter.js").initialize();
require("./newTabPage.js").initialize();

// default searchbar plugins

// require('./searchbar/placesPlugin.js').initialize()
require("./searchbar/instantAnswerPlugin.js").initialize();
// require('./searchbar/openTabsPlugin.js').initialize()
// require('./searchbar/bangsPlugin.js').initialize()
// require('./searchbar/customBangs.js').initialize()
require("./searchbar/searchSuggestionsPlugin.js").initialize();
// require('./searchbar/placeSuggestionsPlugin.js').initialize()
// require('./searchbar/updateNotifications.js').initialize()
// require('./searchbar/restoreTaskPlugin.js').initialize()
// require('./searchbar/bookmarkManager.js').initialize()
require("./searchbar/historyViewer.js").initialize();
require("./searchbar/developmentModeNotification.js").initialize();
require("./searchbar/shortcutButtons.js").initialize();
// require('./searchbar/calculatorPlugin.js').initialize()

// once everything's loaded, start the session
require("./sessionRestore.js").restore();
