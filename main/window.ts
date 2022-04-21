// @ts-check

import fs from "fs";
import path from "path";
import type { Rectangle } from "electron";
import { BrowserWindow, app, screen } from "electron";
import { isDevelopment } from "./environment";
import settings from "../js/util/settings/settingsMain";

let mainWindow: BrowserWindow | null;
const browserPage = `file://${__dirname}/index.html`;

export function getMainWindow() {
  return mainWindow;
}

export function destroyMainWindow() {
  mainWindow = null;
}

export async function createMainWindow() {
  const userDataPath = app.getPath("userData");
  const bounds = await getWindowBounds(userDataPath);

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 320, // controls take up more horizontal space on Windows
    minHeight: 350,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 10 },
    icon: __dirname + "/icons/icon256.png",
    frame: settings.get("useSeparateTitlebar"),
    alwaysOnTop: settings.get("windowAlwaysOnTop"),
    backgroundColor: "#fff", // the value of this is ignored, but setting it seems to work around https://github.com/electron/electron/issues/10559
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true, // used by ProcessSpawner
      additionalArguments: [
        "user-data-path=" + userDataPath,
        "app-version=" + app.getVersion(),
        "app-name=" + app.getName(),
        ...(isDevelopment() ? ["development-mode"] : []),
      ],
    },
  });

  mainWindow.on("close", () => {
    // save the window size for the next launch of the app
    if (mainWindow) {
      fs.writeFileSync(
        path.join(userDataPath, "windowBounds.json"),
        JSON.stringify(mainWindow.getBounds())
      );
    }
  });

  return mainWindow;
}

export async function createApp(cb?: (window: BrowserWindow) => void) {
  const mainWindow = await createMainWindow();

  // mainWindow.webContents.openDevTools();

  // and load the index.html of the app.
  mainWindow.loadURL(browserPage);

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    destroyMainWindow();
  });

  mainWindow.on("focus", () => {
    sendIPCToWindow("windowFocus");
  });

  mainWindow.on("minimize", () => {
    sendIPCToWindow("minimize");
  });

  mainWindow.on("maximize", () => {
    sendIPCToWindow("maximize");
  });

  mainWindow.on("unmaximize", () => {
    sendIPCToWindow("unmaximize");
  });

  mainWindow.on("enter-full-screen", () => {
    sendIPCToWindow("enter-full-screen");
  });

  mainWindow.on("leave-full-screen", () => {
    sendIPCToWindow("leave-full-screen");
  });

  mainWindow.on("enter-html-full-screen", () => {
    sendIPCToWindow("enter-html-full-screen");
  });

  mainWindow.on("leave-html-full-screen", () => {
    sendIPCToWindow("leave-html-full-screen");
  });

  // prevent remote pages from being loaded using drag-and-drop, since they would have node access
  mainWindow.webContents.on("will-navigate", (e: Event, url: string) => {
    if (url !== browserPage) e.preventDefault();
  });

  if (cb) cb(mainWindow);
}

export function sendIPCToWindow(action: string, data?: any) {
  const mainWindow = getMainWindow();

  if (mainWindow) {
    mainWindow.webContents.send(action, data || {});
  } else {
    // if there are no windows, create a new one
    createApp((window) => {
      window.webContents.send(action, data || {});
    });
  }
}

function getWindowBounds(userPath: string): Promise<Rectangle> {
  return new Promise((resolve) => {
    fs.readFile(
      path.join(userPath, "windowBounds.json"),
      "utf-8",
      (e, data) => {
        let bounds;

        if (data) {
          try {
            bounds = JSON.parse(data);
          } catch (e) {
            console.warn("error parsing window bounds file: ", e);
          }
        }

        if (e || !data || !bounds) {
          // there was an error, probably because the file doesn't exist
          const screenBounds = screen.getPrimaryDisplay().bounds;
          const width = 800;
          const height = 600;
          bounds = {
            width,
            height,
            x: Math.ceil(screenBounds.x + (screenBounds.width - width) / 2),
            y: Math.ceil(screenBounds.y + (screenBounds.height - height) / 2),
          };
        }

        // make the bounds fit inside a currently-active screen
        // (since the screen Min was previously open on could have been removed)
        // see: https://github.com/minbrowser/min/issues/904
        const containingRect = screen.getDisplayMatching(bounds).workArea;

        resolve({
          x: clamp(
            bounds.x,
            containingRect.x,
            containingRect.x + containingRect.width - bounds.width
          ),
          y: clamp(
            bounds.y,
            containingRect.y,
            containingRect.y + containingRect.height - bounds.height
          ),
          width: clamp(bounds.width, 0, containingRect.width),
          height: clamp(bounds.height, 0, containingRect.height),
        });
      }
    );
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(Math.min(n, max), min);
}
