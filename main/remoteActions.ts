import { app, ipcMain as ipc, dialog, session } from "electron";
import { l } from "../localization";
import { getMainWindow } from "./window";
/*
Wraps APIs that are only available in the main process in IPC messages, so that the BrowserWindow can use them
*/

ipc.handle("test-invoke", () => {
  return 1;
});

ipc.handle("reloadWindow", () => {
  getMainWindow()?.webContents.reload();
});

ipc.handle("startFileDrag", (e, path) => {
  app.getFileIcon(path).then((icon) => {
    getMainWindow()?.webContents.startDrag({
      file: path,
      icon: icon,
    });
  });
});

ipc.handle("showFocusModeDialog1", () => {
  dialog.showMessageBox({
    type: "info",
    buttons: [l("closeDialog")],
    message: l("isFocusMode"),
    detail: l("focusModeExplanation1") + " " + l("focusModeExplanation2"),
  });
});

ipc.handle("showFocusModeDialog2", () => {
  dialog.showMessageBox({
    type: "info",
    buttons: [l("closeDialog")],
    message: l("isFocusMode"),
    detail: l("focusModeExplanation2"),
  });
});

ipc.handle("showOpenDialog", async (e, options) => {
  const result = await dialog.showOpenDialog(getMainWindow()!, options);
  return result.filePaths;
});

ipc.handle("showSaveDialog", async (e, options) => {
  const result = await dialog.showSaveDialog(getMainWindow()!, options);
  return result.filePath;
});

ipc.handle("addWordToSpellCheckerDictionary", (e, word) => {
  session
    .fromPartition("persist:webcontent")
    .addWordToSpellCheckerDictionary(word);
});

ipc.handle("downloadURL", (e, url) => {
  getMainWindow()?.webContents.downloadURL(url);
});

ipc.handle("clearStorageData", () => {
  return (
    session
      .fromPartition("persist:webcontent")
      .clearStorageData()
      /* It's important not to delete data from file:// from the default partition, since that would also remove internal browser data (such as bookmarks). However, HTTP data does need to be cleared, as there can be leftover data from loading external resources in the browser UI */
      .then(() =>
        session.defaultSession.clearStorageData({ origin: "http://" })
      )
      .then(() =>
        session.defaultSession.clearStorageData({
          origin: "https://",
        })
      )
      .then(() => session.fromPartition("persist:webcontent").clearCache())
      .then(() =>
        session.fromPartition("persist:webcontent").clearHostResolverCache()
      )
      .then(() => session.fromPartition("persist:webcontent").clearAuthCache())
      .then(() => session.defaultSession.clearCache())
      .then(() => session.defaultSession.clearHostResolverCache())
      .then(() => session.defaultSession.clearAuthCache())
  );
});
