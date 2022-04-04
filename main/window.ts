// @ts-check

import fs from "fs"
import path from "path"
import type {Rectangle} from "electron"
import { BrowserWindow, app, screen } from "electron";
import settings from "../js/util/settings/settingsMain"

let mainWindow: BrowserWindow | null

export function getMainWindow() {
  return mainWindow
}

export function destroyMainWindow() {
  mainWindow = null
}

export async function createMainWindow(isDevelopmentMode: boolean) {
  const userDataPath = app.getPath("userData");
  const bounds = await getWindowBounds(userDataPath)

  return (mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 320, // controls take up more horizontal space on Windows
    minHeight: 350,
    titleBarStyle: settings.get("useSeparateTitlebar") ? "default" : "hidden",
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
        "--user-data-path=" + userDataPath,
        "--app-version=" + app.getVersion(),
        "--app-name=" + app.getName(),
        ...(isDevelopmentMode ? ["--development-mode"] : []),
      ],
    },
  }));
}

function getWindowBounds(userPath: string): Promise<Rectangle> {
  return new Promise((resolve) => {
    fs.readFile(path.join(userPath, 'windowBounds.json'), 'utf-8', (e, data) => {
      let bounds
  
      if (data) {
        try {
          bounds = JSON.parse(data)
        } catch (e) {
          console.warn('error parsing window bounds file: ', e)
        }
      }
  
      if (e || !data || !bounds) { // there was an error, probably because the file doesn't exist
        const screenBounds = screen.getPrimaryDisplay().bounds
        const width = 800
        const height = 600
        bounds = {
          width,
          height,
          x: Math.ceil(screenBounds.x + ((screenBounds.width - width) / 2)),
          y: Math.ceil(screenBounds.y + ((screenBounds.height - height) / 2)),
        }
      }
  
      // make the bounds fit inside a currently-active screen
      // (since the screen Min was previously open on could have been removed)
      // see: https://github.com/minbrowser/min/issues/904
      const containingRect = screen.getDisplayMatching(bounds).workArea
  
      resolve({
        x: clamp(bounds.x, containingRect.x, (containingRect.x + containingRect.width) - bounds.width),
        y: clamp(bounds.y, containingRect.y, (containingRect.y + containingRect.height) - bounds.height),
        width: clamp(bounds.width, 0, containingRect.width),
        height: clamp(bounds.height, 0, containingRect.height),
      })
    })
  })
  
}

function clamp(n: number, min: number, max: number) {
  return Math.max(Math.min(n, max), min)
}
