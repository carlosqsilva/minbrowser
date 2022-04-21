import { app, ipcMain as ipc } from "electron";
import settings from "../js/util/settings/settingsMain";
import { destroyAllViews } from "./viewManager";
import { createApp, getMainWindow, sendIPCToWindow } from "./window";
import { createAppMenu, createDockMenu } from "./menu";

// workaround for flicker when focusing app (https://github.com/electron/electron/issues/17942)
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true");

const isFirstInstance = app.requestSingleInstanceLock();

if (!isFirstInstance) {
  app.quit();
  process.exit(0);
}

let appIsReady = false;

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", () => {
  settings.set("restartNow", false);
  appIsReady = true;

  createApp((mainWindow) => {
    mainWindow.on("close", () => {
      destroyAllViews();
    });

    mainWindow.webContents.on("did-finish-load", () => {
      // if a URL was passed as a command line argument (probably because Min is set as the default browser on Linux), open it.
      // handleCommandLineArguments(process.argv)

      // there is a URL from an "open-url" event (on Mac)
      if (global.URLToOpen) {
        // if there is a previously set URL to open (probably from opening a link on macOS), open it
        sendIPCToWindow("addTab", {
          url: global.URLToOpen,
        });
        global.URLToOpen = null;
      }
    });
  });

  createAppMenu();
  createDockMenu();
});

app.on("open-url", (e, url) => {
  if (appIsReady) {
    sendIPCToWindow("addTab", {
      url: url,
    });
  } else {
    global.URLToOpen = url; // this will be handled later in the createWindow callback
  }
});

app.on("second-instance", () => {
  const mainWindow = getMainWindow();

  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

/**
 * Emitted when the application is activated, which usually happens when clicks on the applications's dock icon
 * https://github.com/electron/electron/blob/master/docs/api/app.md#event-activate-os-x
 *
 * Opens a new tab when all tabs are closed, and min is still open by clicking on the application dock icon
 */
app.on("activate", (/* e, hasVisibleWindows */) => {
  if (!getMainWindow() && appIsReady) {
    // sometimes, the event will be triggered before the app is ready, and creating new windows will fail
    createApp();
  }
});

ipc.on("focusMainWebContents", () => {
  getMainWindow()?.webContents.focus();
});

ipc.on("quit", () => {
  app.quit();
});

import "./filtering";
import "./download";
import "./UASwitcher";
import "./permissionManager";
import "./prompt";
import "./remoteMenu";
import "./remoteActions";
import "./keychainService";
import "../js/util/proxy";
import "./themeMain";
