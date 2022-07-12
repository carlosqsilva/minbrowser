import { BrowserWindow, app, screen } from "electron";

import { isDevelopment } from "./environment";
import { localStorage } from "./localStorage";

interface Bounds {
  height?: number;
  width?: number;
  x?: number;
  y?: number;
}

const browserPage = `file://${__dirname}/index.html`;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const MINIMUM_WIDTH = 500;
const MINIMUM_HEIGHT = 400;

let mainWindow: BrowserWindow | null = null;

export function getMainWindow() {
  return mainWindow;
}

export function destroyMainWindow() {
  mainWindow = null;
}

export async function createMainWindow() {
  const { bounds, fullscreen, maximize } = getWindowBounds();
  const { x, y, width, height } = bounds;

  let isVisibleOnAnyDisplay = true;

  for (const d of screen.getAllDisplays()) {
    const isVisibleOnDisplay =
      x >= d.bounds.x &&
      y >= d.bounds.y &&
      x + width <= d.bounds.x + d.bounds.width &&
      y + height <= d.bounds.y + d.bounds.height;

    if (!isVisibleOnDisplay) {
      isVisibleOnAnyDisplay = false;
    }
  }

  mainWindow = new BrowserWindow({
    x: isVisibleOnAnyDisplay ? x : undefined,
    y: isVisibleOnAnyDisplay ? y : undefined,
    width: width || DEFAULT_WIDTH,
    height: height || DEFAULT_HEIGHT,
    minWidth: MINIMUM_WIDTH,
    minHeight: MINIMUM_HEIGHT,
    fullscreen: fullscreen,
    fullscreenable: true,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 10 },
    icon: __dirname + "/icons/icon256.png",
    // frame: settings.get("useSeparateTitlebar"),
    // alwaysOnTop: settings.get("windowAlwaysOnTop"),
    backgroundColor: "#fff", // the value of this is ignored, but setting it seems to work around https://github.com/electron/electron/issues/10559
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true, // used by ProcessSpawner
      additionalArguments: [
        "user-data-path=" + app.getPath("userData"),
        "app-version=" + app.getVersion(),
        "app-name=" + app.getName(),
        ...(isDevelopment() ? ["development-mode"] : []),
      ],
    },
  });

  if (maximize) {
    mainWindow.maximize();
  }

  mainWindow?.on("resize", () => saveWindowBounds());
  mainWindow?.on("maximize", () => saveWindowBounds());
  mainWindow?.on("unmaximize", () => saveWindowBounds());
  mainWindow?.on("move", () => saveWindowBounds());
  mainWindow.on("close", () => saveWindowBounds());

  return mainWindow;
}

export async function createApp(cb?: (window: BrowserWindow) => void) {
  const mainWindow = await createMainWindow();

  mainWindow.webContents.openDevTools();

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

  // prevent remote pages from being loaded using drag-and-drop,
  // since they would have node access
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

function getWindowBounds(): {
  bounds: Bounds;
  fullscreen: boolean;
  maximize: boolean;
} {
  return {
    bounds: localStorage.getItem("bounds", {}),
    maximize: localStorage.getItem("fullscreen", false),
    fullscreen: localStorage.getItem("maximize", false),
  };
}

function saveWindowBounds() {
  const [window] = BrowserWindow.getAllWindows();
  if (!window) return;

  if (!window.isFullScreen()) {
    localStorage.setItem("bounds", mainWindow.getBounds());
    localStorage.setItem("maximize", mainWindow.isMaximized());
    localStorage.setItem("fullscreen", false);
  } else {
    localStorage.setItem("fullscreen", true);
  }
}
