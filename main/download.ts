import type { Session } from "electron";
import { ipcMain as ipc, app, session } from "electron";
import path from "path";

// import { getViewIDFromWebContents } from "./viewManager";
import { sendIPCToWindow } from "./window";

const currrentDownloadItems = {};

ipc.on("cancelDownload", function (e, path) {
  if (currrentDownloadItems[path]) {
    currrentDownloadItems[path].cancel();
  }
});

function isAttachment(header) {
  return /^\s*attache*?ment/i.test(header);
}

function downloadHandler(event, item, webContents) {
  let savePathFilename;

  // send info to download manager
  sendIPCToWindow("download-info", {
    path: item.getSavePath(),
    name: item.getFilename(),
    status: "progressing",
    size: { received: 0, total: item.getTotalBytes() },
  });

  item.on("updated", (e, state) => {
    if (!savePathFilename) {
      savePathFilename = path.basename(item.getSavePath());
    }

    if (item.getSavePath()) {
      currrentDownloadItems[item.getSavePath()] = item;
    }

    sendIPCToWindow("download-info", {
      path: item.getSavePath(),
      name: savePathFilename,
      status: state,
      size: {
        received: item.getReceivedBytes(),
        total: item.getTotalBytes(),
      },
    });
  });

  item.once("done", (e, state) => {
    delete currrentDownloadItems[item.getSavePath()];
    sendIPCToWindow("download-info", {
      path: item.getSavePath(),
      name: savePathFilename,
      status: state,
      size: { received: item.getTotalBytes(), total: item.getTotalBytes() },
    });
  });

  return true;
}

function listenForDownloadHeaders(ses: Session) {
  ses.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType === "mainFrame" && details.responseHeaders) {
      // workaround for https://github.com/electron/electron/issues/24334
      const typeHeader =
        details.responseHeaders[
          Object.keys(details.responseHeaders).filter(
            (k) => k.toLowerCase() === "content-type"
          )[0]
        ];

      const attachment = isAttachment(
        details.responseHeaders[
          Object.keys(details.responseHeaders).filter(
            (k) => k.toLowerCase() === "content-disposition"
          )[0]
        ]
      );

      // whether this is a file being viewed in-browser or a page
      // Needed to save files correctly: https://github.com/minbrowser/min/issues/1717
      // It doesn't make much sense to have this here, but only one onHeadersReceived instance can be created per session
      const isFileView =
        typeHeader instanceof Array &&
        !typeHeader.some((t) => t.includes("text/html"));

      sendIPCToWindow("set-file-view", {
        url: details.url,
        isFileView,
      });
    }
    callback({ cancel: false });
  });
}

app.once("ready", () => {
  session.defaultSession.on("will-download", downloadHandler);
  listenForDownloadHeaders(session.defaultSession);
});

app.on("session-created", (session) => {
  session.on("will-download", downloadHandler);
  listenForDownloadHeaders(session);
});
