/* Simple input prompt. */
import { BrowserWindow, ipcMain as ipc } from "electron";
import { getMainWindow } from "./window";
// import settings from "../js/util/settings/settingsMain";
import { localStorage } from "./localStorage";

let promptAnswer: string;
let promptOptions: Record<string, any>;

export function createPrompt(options, callback) {
  promptOptions = options;
  const { parent, width = 360, height = 140 } = options;

  let promptWindow: BrowserWindow | null = new BrowserWindow({
    width: width,
    height: height,
    parent: parent != null ? parent : getMainWindow(),
    show: false,
    modal: true,
    alwaysOnTop: true,
    title: options.title,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      sandbox: false,
      contextIsolation: false,
    },
  });

  promptWindow.on("closed", () => {
    promptWindow = null;
    callback(promptAnswer);
  });

  // Load the HTML dialog box
  promptWindow.loadURL("file://" + __dirname + "/pages/prompt/index.html");
  promptWindow.once("ready-to-show", () => {
    promptWindow?.show();
  });
}

ipc.on("show-prompt", (options, callback) => {
  createPrompt(options, callback);
});

ipc.on("open-prompt", (event) => {
  event.returnValue = JSON.stringify({
    label: promptOptions.text,
    ok: promptOptions.ok,
    values: promptOptions.values,
    cancel: promptOptions.cancel,
    darkMode: localStorage.getItem("darkMode", false),
  });
});

ipc.on("close-prompt", (event, data) => {
  promptAnswer = data;
});

ipc.on("prompt", (event, data) => {
  createPrompt(data, (result) => {
    event.returnValue = result;
  });
});
