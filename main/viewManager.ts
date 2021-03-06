import {
  BrowserView,
  ipcMain as ipc,
  app,
  shell,
  dialog,
  WebPreferences,
  WebContents,
} from "electron";

import { createPrompt } from "./prompt";
import { l } from "../localization";
import { getMainWindow } from "./window";
// import { filterPopups } from "./filtering";

const knownProtocols = new Set([
  "http",
  "https",
  "file",
  "min",
  "about",
  "data",
  "javascript",
  "chrome",
]);

const viewMap: Record<string, BrowserView> = {}; // id: view
const viewStateMap = {}; // id: view state
let selectedView = null;

const temporaryPopupViews = {}; // id: view

const defaultViewWebPreferences: WebPreferences = {
  nodeIntegration: false,
  nodeIntegrationInSubFrames: true,
  scrollBounce: true,
  safeDialogs: true,
  safeDialogsMessage: "Prevent this page from creating additional dialogs",
  preload: __dirname + "/dist/preload.js",
  contextIsolation: true,
  sandbox: true,
  // enableRemoteModule: false,
  // allowPopups: false,
  // partition: partition || 'persist:webcontent',
  enableWebSQL: false,
  autoplayPolicy: "user-gesture-required",
  // match Chrome's default for anti-fingerprinting purposes (Electron defaults to 0)
  minimumFontSize: 6,
};

function createView(
  existingViewId,
  id,
  webPreferencesString,
  boundsString,
  events
) {
  viewStateMap[id] = { loadedInitialURL: false };

  let view: BrowserView;

  if (existingViewId) {
    view = temporaryPopupViews[existingViewId];
    delete temporaryPopupViews[existingViewId];

    // the initial URL has already been loaded, so set the background color
    view.setBackgroundColor("#fff");
    viewStateMap[id].loadedInitialURL = true;
  } else {
    view = new BrowserView({
      webPreferences: Object.assign(
        {},
        defaultViewWebPreferences,
        JSON.parse(webPreferencesString)
      ),
    });
  }

  events.forEach((event) => {
    view.webContents.on(event, (...args) => {
      getMainWindow()?.webContents.send("view-event", {
        viewId: id,
        event: event,
        args: args.slice(1),
      });
    });
  });

  view.webContents.on(
    "select-bluetooth-device",
    (event, deviceList, callback) => {
      event.preventDefault();
      callback("");
    }
  );

  view.webContents.setWindowOpenHandler((details) => {
    /*
      Opening a popup with window.open() generally requires features to be set
      So if there are no features, the event is most likely from clicking on a link, which should open a new tab.
      Clicking a link can still have a "new-window" or "foreground-tab" disposition depending on which keys are pressed
      when it is clicked.
      (https://github.com/minbrowser/min/issues/1835)
    */
    if (!details.features) {
      getMainWindow()?.webContents.send("view-event", {
        viewId: id,
        event: "new-tab",
        args: [details.url, !(details.disposition === "background-tab")],
      });
      return {
        action: "deny",
      };
    }

    return {
      action: "allow",
    };
  });

  // view.webContents.removeAllListeners("-add-new-contents");

  // view.webContents.on(
  //   "-add-new-contents",
  //   (
  //     e,
  //     webContents,
  //     disposition,
  //     _userGesture,
  //     _left,
  //     _top,
  //     _width,
  //     _height,
  //     url,
  //     frameName,
  //     referrer,
  //     rawFeatures,
  //     postData
  //   ) => {
  //     if (!filterPopups(url)) {
  //       return;
  //     }

  //     const view = new BrowserView({
  //       webPreferences: defaultViewWebPreferences,
  //       // webContents: webContents,
  //     });

  //     const popupId = Math.random().toString();
  //     temporaryPopupViews[popupId] = view;

  //     getMainWindow().webContents.send("view-event", {
  //       viewId: id,
  //       event: "did-create-popup",
  //       args: [popupId, url],
  //     });
  //   }
  // );

  view.webContents.on("ipc-message", (e, channel, data) => {
    getMainWindow()?.webContents.send("view-ipc", {
      id: id,
      name: channel,
      data: data,
    });
  });

  // Open a login prompt when site asks for http authentication
  view.webContents.on(
    "login",
    (event, authenticationResponseDetails, authInfo, callback) => {
      if (authInfo.scheme !== "basic") {
        // Only for basic auth
        return;
      }
      event.preventDefault();

      const title = l("loginPromptTitle")
        .replace("%h", authInfo.host)
        .replace("%r", authInfo.realm);

      createPrompt(
        {
          text: title,
          values: [
            { placeholder: l("username"), id: "username", type: "text" },
            { placeholder: l("password"), id: "password", type: "password" },
          ],
          ok: l("dialogConfirmButton"),
          cancel: l("dialogSkipButton"),
          width: 400,
          height: 200,
        },
        function (result) {
          // resend request with auth credentials
          callback(result.username, result.password);
        }
      );
    }
  );

  // show an "open in app" prompt for external protocols
  function handleExternalProtocol(
    e,
    url,
    isInPlace,
    isMainFrame,
    frameProcessId,
    frameRoutingId
  ) {
    if (!knownProtocols.has(url.split(":")[0])) {
      const externalApp = app.getApplicationNameForProtocol(url);
      if (externalApp) {
        // TODO find a better way to do this
        // (the reason to use executeJS instead of the Electron dialog API is so we get the "prevent this page from creating additional dialogs" checkbox)
        const sanitizedName = externalApp.replace(/[^a-zA-Z0-9.]/g, "");
        if (view.webContents.getURL()) {
          view.webContents
            .executeJavaScript(
              `confirm('${l("openExternalApp").replace("%s", sanitizedName)}')`
            )
            .then((result) => {
              if (result === true) {
                shell.openExternal(url);
              }
            });
        } else {
          // the code above tries to show the dialog in a browserview, but if the view has no URL, this won't work.
          // so show the dialog globally as a fallback
          const result = dialog.showMessageBoxSync({
            type: "question",
            buttons: ["OK", "Cancel"],
            message: l("openExternalApp")
              .replace("%s", sanitizedName)
              .replace(/\\/g, ""),
          });

          if (result === 0) {
            shell.openExternal(url);
          }
        }
      }
    }
  }

  view.webContents.on("did-start-navigation", handleExternalProtocol);
  /*
  It's possible for an HTTP request to redirect to an external app link
  (primary use case for this is OAuth from desktop app > browser > back to app)
  and did-start-navigation isn't (always?) emitted for redirects, so we need this handler as well
  */
  view.webContents.on("will-redirect", handleExternalProtocol);

  view.setBounds(JSON.parse(boundsString));

  viewMap[id] = view;

  return view;
}

const destroyView = (id: string) => {
  if (!viewMap[id]) {
    return;
  }

  const mainWindow = getMainWindow();

  if (viewMap[id] === mainWindow?.getBrowserView()) {
    mainWindow?.setBrowserView(null);
    selectedView = null;
  }

  // @ts-ignore - undocumented method
  viewMap[id].webContents.destroy();

  delete viewMap[id];
  delete viewStateMap[id];
};

export const destroyAllViews = () => {
  for (const id in viewMap) {
    destroyView(id);
  }
};

const setView = (id) => {
  const mainWindow = getMainWindow();

  if (mainWindow.getBrowserView() !== viewMap[id]) {
    if (viewStateMap[id].loadedInitialURL) {
      mainWindow?.setBrowserView(viewMap[id]);
    } else {
      mainWindow?.setBrowserView(null);
    }
    selectedView = id;
  }
};

const setBounds = (id: string, bounds) => {
  if (viewMap[id]) {
    viewMap[id].setBounds(bounds);
  }
};

const focusView = (id: string) => {
  const mainWindow = getMainWindow();
  // empty views can't be focused because they won't propogate keyboard events correctly, see https://github.com/minbrowser/min/issues/616
  // also, make sure the view exists, since it might not if the app is shutting down
  if (
    viewMap[id] &&
    (viewMap[id].webContents.getURL() !== "" ||
      viewMap[id].webContents.isLoading())
  ) {
    viewMap[id].webContents.focus();
  } else if (mainWindow) {
    mainWindow.webContents.focus();
  }
};

const hideCurrentView = () => {
  const mainWindow = getMainWindow();
  mainWindow?.setBrowserView(null);
  selectedView = null;
  mainWindow?.webContents.focus();
};

// const getView = (id: string) => {
//   return viewMap[id];
// };

export const getViewIDFromWebContents = (contents: WebContents) => {
  for (let id in viewMap) {
    if (viewMap[id].webContents === contents) {
      return id;
    }
  }
};

ipc.on("createView", (e, args) => {
  createView(
    args.existingViewId,
    args.id,
    args.webPreferencesString,
    args.boundsString,
    args.events
  );
});

ipc.on("destroyView", (e, id) => {
  destroyView(id);
});

ipc.on("destroyAllViews", () => {
  destroyAllViews();
});

ipc.on("setView", (e, args) => {
  setView(args.id);
  setBounds(args.id, args.bounds);
  if (args.focus) {
    focusView(args.id);
  }
});

ipc.on("setBounds", (e, args) => {
  setBounds(args.id, args.bounds);
});

ipc.on("focusView", (e, id) => {
  focusView(id);
});

ipc.on("hideCurrentView", (e) => {
  hideCurrentView();
});

ipc.on("loadURLInView", (e, args) => {
  // wait until the first URL is loaded to set the background color so that new tabs can use a custom background
  if (!viewStateMap[args.id].loadedInitialURL) {
    viewMap[args.id].setBackgroundColor("#fff");
    // If the view has no URL, it won't be attached yet
    if (args.id === selectedView) {
      getMainWindow()?.setBrowserView(viewMap[args.id]);
    }
  }
  viewMap[args.id].webContents.loadURL(args.url);
  viewStateMap[args.id].loadedInitialURL = true;
});

ipc.on("callViewMethod", (e, data) => {
  var error, result;
  try {
    const webContents = viewMap[data.id].webContents;
    const methodOrProp = webContents[data.method];
    if (methodOrProp instanceof Function) {
      // call function
      result = methodOrProp.apply(webContents, data.args);
    } else {
      // set property
      if (data.args && data.args.length > 0) {
        webContents[data.method] = data.args[0];
      }
      // read property
      result = methodOrProp;
    }
  } catch (e) {
    error = e;
  }
  if (result instanceof Promise) {
    result.then((result) => {
      if (data.callId) {
        getMainWindow()?.webContents.send("async-call-result", {
          callId: data.callId,
          error: null,
          result,
        });
      }
    });
    result.catch((error) => {
      if (data.callId) {
        getMainWindow()?.webContents.send("async-call-result", {
          callId: data.callId,
          error,
          result: null,
        });
      }
    });
  } else if (data.callId) {
    getMainWindow()?.webContents.send("async-call-result", {
      callId: data.callId,
      error,
      result,
    });
  }
});

ipc.on("getCapture", (e, data) => {
  const view = viewMap[data.id];
  if (!view) {
    // view could have been destroyed
    return;
  }

  view.webContents.capturePage().then((img) => {
    const size = img.getSize();
    if (size.width === 0 && size.height === 0) {
      return;
    }
    img = img.resize({ width: data.width, height: data.height });
    getMainWindow()?.webContents.send("captureData", {
      id: data.id,
      url: img.toDataURL(),
    });
  });
});

ipc.on("saveViewCapture", (e, data) => {
  const view = viewMap[data.id];
  if (!view) {
    // view could have been destroyed
  }

  view.webContents.capturePage().then((image) => {
    view.webContents.downloadURL(image.toDataURL());
  });
});
