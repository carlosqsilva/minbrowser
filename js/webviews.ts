import { ipcRenderer as ipc } from "electron";

import { urlParser } from "./util/urlParser";
import settings from "./util/settings/settings";

/* implements selecting webviews, switching between them, and creating new ones. */

const placeholderImg = document.getElementById(
  "webview-placeholder"
) as HTMLImageElement;

import { tasks } from "./tabState";

const NAVBAR_HEIGHT = 36;

function captureCurrentTab(options?: { forceCapture: boolean }) {
  if (tasks.tabs.get(tasks.tabs.getSelected()!).private) {
    // don't capture placeholders for private tabs
    return;
  }

  if (
    webviews.placeholderRequests.length > 0 &&
    !(options && options.forceCapture === true)
  ) {
    // capturePage doesn't work while the view is hidden
    return;
  }

  ipc.send("getCapture", {
    id: webviews.selectedId,
    width: Math.round(window.innerWidth / 10),
    height: Math.round(window.innerHeight / 10),
  });
}

// called whenever a new page starts loading, or an in-page navigation occurs
function onPageURLChange(tab, url) {
  if (
    url.indexOf("https://") === 0 ||
    url.indexOf("about:") === 0 ||
    url.indexOf("chrome:") === 0 ||
    url.indexOf("file://") === 0
  ) {
    tasks.tabs.update(tab, {
      secure: true,
      url: url,
    });
  } else {
    tasks.tabs.update(tab, {
      secure: false,
      url: url,
    });
  }
}

// called whenever a navigation finishes
function onNavigate(
  tabId,
  url,
  isInPlace,
  isMainFrame,
  frameProcessId,
  frameRoutingId
) {
  if (isMainFrame) {
    onPageURLChange(tabId, url);
  }
}

// called whenever the page finishes loading
function onPageLoad(tabId) {
  // capture a preview image if a new page has been loaded
  if (tabId === tasks.tabs.getSelected()) {
    setTimeout(() => {
      // sometimes the page isn't visible until a short time after the did-finish-load event occurs
      captureCurrentTab();
    }, 250);
  }
}

function scrollOnLoad(tabId, scrollPosition) {
  const listener = function (eTabId) {
    if (eTabId === tabId) {
      // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
      // but stop once we've successfully scrolled once so we don't overwrite user scroll attempts that happen later
      for (let i = 0; i < 3; i++) {
        var done = false;
        setTimeout(function () {
          if (!done) {
            webviews.callAsync(
              tabId,
              "executeJavaScript",
              `
            (function() {
              window.scrollTo(0, ${scrollPosition})
              return window.scrollY === ${scrollPosition}
            })()
            `,
              function (err, completed) {
                if (!err && completed) {
                  done = true;
                }
              }
            );
          }
        }, 750 * i);
      }
      webviews.unbindEvent("did-finish-load", listener);
    }
  };
  webviews.bindEvent("did-finish-load", listener);
}

function setAudioMutedOnCreate(tabId, muted) {
  const listener = function () {
    webviews.callAsync(tabId, "setAudioMuted", muted);
    webviews.unbindEvent("did-navigate", listener);
  };
  webviews.bindEvent("did-navigate", listener);
}

type Func = (...args: any[]) => void;

class Webviews {
  public viewList: string[] = []; // [tabId]
  public viewFullscreenMap = {}; // tabId, isFullscreen
  public selectedId: string | null = null;
  public placeholderRequests: any[] = [];
  public asyncCallbacks = {};
  public events: Array<{ event: string; fn: Func }> = [];
  public IPCEvents: Array<{ name: string; fn: Func }> = [];
  public viewMargins = [0, 0, 0, 0]; // top, right, bottom, left
  public internalPages = {
    error: urlParser.getFileURL(__dirname + "/pages/error/index.html"),
  };

  public bindEvent(event, fn) {
    this.events.push({
      event: event,
      fn: fn,
    });
  }

  public unbindEvent(event, fn) {
    for (var i = 0; i < this.events.length; i++) {
      if (this.events[i].event === event && this.events[i].fn === fn) {
        this.events.splice(i, 1);
        i--;
      }
    }
  }

  public emitEvent(event: string, viewId: string, args?: any) {
    if (!this.viewList.includes(viewId)) {
      // the view could have been destroyed between when the event was occured and when it was recieved in the UI process, see https://github.com/minbrowser/min/issues/604#issuecomment-419653437
      return;
    }
    this.events.forEach((ev) => {
      if (ev.event === event) {
        ev.fn.apply(this, [viewId].concat(args));
      }
    });
  }

  public bindIPC(name, fn) {
    this.IPCEvents.push({
      name: name,
      fn: fn,
    });
  }

  public adjustMargin(margins: number[]) {
    for (let i = 0; i < margins.length; i++) {
      this.viewMargins[i] += margins[i];
    }
    this.resize();
  }

  public getViewBounds() {
    if (this.selectedId && this.viewFullscreenMap[this.selectedId]) {
      return {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    } else {
      const viewMargins = this.viewMargins;
      return {
        x: 0 + Math.round(viewMargins[3]),
        y: 0 + Math.round(viewMargins[0]) + NAVBAR_HEIGHT,
        width: window.innerWidth - Math.round(viewMargins[1] + viewMargins[3]),
        height:
          window.innerHeight -
          Math.round(viewMargins[0] + viewMargins[2]) -
          NAVBAR_HEIGHT,
      };
    }
  }

  public add(tabId: string, existingViewId?: string) {
    const tabData = tasks.tabs.get(tabId);

    // needs to be called before the view is created to that its listeners can be registered
    if (tabData.scrollPosition) {
      scrollOnLoad(tabId, tabData.scrollPosition);
    }

    if (tabData.muted) {
      setAudioMutedOnCreate(tabId, tabData.muted);
    }

    // if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
    // since tab IDs are unique, we can use them as partition names
    let partition: string | undefined;
    if (tabData.private === true) {
      // options.tabId is a number, which remote.session.fromPartition won't accept. It must be converted to a string first
      partition = tabId.toString();
    }

    ipc.send("createView", {
      existingViewId,
      id: tabId,
      webPreferencesString: JSON.stringify({
        partition: partition || "persist:webcontent",
      }),
      boundsString: JSON.stringify(this.getViewBounds()),
      events: this.events
        .map((e) => e.event)
        .filter((i, idx, arr) => arr.indexOf(i) === idx),
    });

    if (!existingViewId) {
      if (tabData.url) {
        ipc.send("loadURLInView", {
          id: tabData.id,
          url: urlParser.parse(tabData.url),
        });
      } else if (tabData.private) {
        // workaround for https://github.com/minbrowser/min/issues/872
        ipc.send("loadURLInView", {
          id: tabData.id,
          url: urlParser.parse("min://newtab"),
        });
      }
    }

    this.viewList.push(tabId);
  }

  public setSelected(id: string, options?: any) {
    // options.focus - whether to focus the view. Defaults to true.
    if (this.selectedId) {
      this.emitEvent("view-hidden", this.selectedId);
    }

    this.selectedId = id;

    // create the view if it doesn't already exist
    if (!this.viewList.includes(id)) {
      this.add(id);
    }

    if (this.placeholderRequests.length > 0) {
      // update the placeholder instead of showing the actual view
      this.requestPlaceholder();
      return;
    }

    ipc.send("setView", {
      id: id,
      bounds: this.getViewBounds(),
      focus: !options || options.focus !== false,
    });
    this.emitEvent("view-shown", id);
  }

  public update(id, url) {
    ipc.send("loadURLInView", { id: id, url: urlParser.parse(url) });
  }

  public destroy(id) {
    this.emitEvent("view-hidden", id);

    if (this.viewList.includes(id)) {
      this.viewList.splice(this.viewList.indexOf(id), 1);
      ipc.send("destroyView", id);
    }
    delete this.viewFullscreenMap[id];
    if (this.selectedId === id) {
      this.selectedId = null;
    }
  }

  public requestPlaceholder(reason?: any) {
    if (reason && !this.placeholderRequests.includes(reason)) {
      this.placeholderRequests.push(reason);
    }
    if (this.placeholderRequests.length >= 1) {
      // create a new placeholder

      const associatedTab = tasks
        .getTaskContainingTab(this.selectedId)
        ?.tabs.get(this.selectedId!);

      const img = associatedTab?.previewImage;

      if (img) {
        placeholderImg.src = img;
        placeholderImg.hidden = false;
      } else if (associatedTab && associatedTab.url) {
        captureCurrentTab({ forceCapture: true });
      } else {
        placeholderImg.hidden = true;
      }
    }
    setTimeout(() => {
      // wait to make sure the image is visible before the view is hidden
      // make sure the placeholder was not removed between when the timeout was created and when it occurs
      if (this.placeholderRequests.length > 0) {
        ipc.send("hideCurrentView");
        this.emitEvent("view-hidden", this.selectedId!);
      }
    }, 0);
  }

  public hidePlaceholder(reason) {
    if (this.placeholderRequests.includes(reason)) {
      this.placeholderRequests.splice(
        this.placeholderRequests.indexOf(reason),
        1
      );
    }

    if (this.placeholderRequests.length === 0) {
      // multiple things can request a placeholder at the same time, but we should only show the view again if nothing requires a placeholder anymore
      if (this.selectedId && this.viewList.includes(this.selectedId)) {
        ipc.send("setView", {
          id: this.selectedId,
          bounds: this.getViewBounds(),
          focus: true,
        });
        this.emitEvent("view-shown", this.selectedId);
      }
      // wait for the view to be visible before removing the placeholder
      setTimeout(() => {
        if (this.placeholderRequests.length === 0) {
          // make sure the placeholder hasn't been re-enabled
          placeholderImg.hidden = true;
        }
      }, 400);
    }
  }

  public releaseFocus() {
    ipc.send("focusMainWebContents");
  }

  public focus() {
    if (this.selectedId) {
      ipc.send("focusView", this.selectedId);
    }
  }

  public resize() {
    ipc.send("setBounds", {
      id: this.selectedId,
      bounds: this.getViewBounds(),
    });
  }

  public goBackIgnoringRedirects(id) {
    /* If the current page is an error page, we actually want to go back 2 pages, since the last page would otherwise send us back to the error page
    TODO we want to do the same thing for reader mode as well, but only if the last page was redirected to reader mode (since it could also be an unrelated page)
    */

    var url = tasks.tabs.get(id).url;

    if (url.startsWith(urlParser.parse("min://error"))) {
      this.callAsync(id, "canGoToOffset", -2, (err, result) => {
        if (!err && result === true) {
          this.callAsync(id, "goToOffset", -2);
        } else {
          this.callAsync(id, "goBack");
        }
      });
    } else {
      this.callAsync(id, "goBack");
    }
  }
  /*
  Can be called as
  callAsync(id, method, args, callback) -> invokes method with args, runs callback with (err, result)
  callAsync(id, method, callback) -> invokes method with no args, runs callback with (err, result)
  callAsync(id, property, value, callback) -> sets property to value
  callAsync(id, property, callback) -> reads property, runs callback with (err, result)
   */
  public callAsync(
    id: string,
    method: string,
    argsOrCallback?: any,
    callback?: Function
  ) {
    let args = argsOrCallback;
    let cb = callback;
    let callId: number | undefined;

    if (argsOrCallback instanceof Function && !cb) {
      args = [];
      cb = argsOrCallback;
    }

    if (!(args instanceof Array)) {
      args = [args];
    }

    if (cb) {
      callId = Math.random();
      this.asyncCallbacks[callId] = cb;
    }

    ipc.send("callViewMethod", {
      id: id,
      callId: callId,
      method: method,
      args: args,
    });
  }
}

const webviews = new Webviews();

let timeout: number;
window.addEventListener(
  "resize",
  () => {
    if (timeout) {
      cancelAnimationFrame(timeout);
    }
    timeout = requestAnimationFrame(() => {
      if (webviews.placeholderRequests.length > 0) {
        return;
      }
      webviews.resize();
    });
  },
  { passive: true }
  // throttle(() => {
  //   if (webviews.placeholderRequests.length > 0) {
  //     // can't set view bounds if the view is hidden
  //     return;
  //   }
  //   webviews.resize();
  // }, 75)
);

// leave HTML fullscreen when leaving window fullscreen
ipc.on("leave-full-screen", () => {
  // electron normally does this automatically (https://github.com/electron/electron/pull/13090/files), but it doesn't work for BrowserViews
  for (var view in webviews.viewFullscreenMap) {
    if (webviews.viewFullscreenMap[view]) {
      webviews.callAsync(
        view,
        "executeJavaScript",
        "document.exitFullscreen()"
      );
    }
  }
});

webviews.bindEvent("enter-html-full-screen", (tabId) => {
  webviews.viewFullscreenMap[tabId] = true;
  webviews.resize();
});

webviews.bindEvent("leave-html-full-screen", (tabId) => {
  webviews.viewFullscreenMap[tabId] = false;
  webviews.resize();
});

ipc.on("maximize", () => {
  webviews.resize();
});

ipc.on("unmaximize", () => {
  webviews.resize();
});

ipc.on("enter-full-screen", () => {
  webviews.resize();
});

ipc.on("leave-full-screen", () => {
  webviews.resize();
});

webviews.bindEvent("did-start-navigation", onNavigate);
webviews.bindEvent("will-redirect", onNavigate);
webviews.bindEvent("did-navigate", (tabId, url) => {
  onPageURLChange(tabId, url);
});

webviews.bindEvent("did-finish-load", onPageLoad);

webviews.bindEvent("page-title-updated", (tabId, title) => {
  tasks.tabs.update(tabId, {
    title: title,
  });
});

webviews.bindEvent(
  "did-fail-load",
  (tabId, errorCode, errorDesc, validatedURL, isMainFrame) => {
    if (errorCode && errorCode !== -3 && isMainFrame && validatedURL) {
      webviews.update(
        tabId,
        webviews.internalPages.error +
          "?ec=" +
          encodeURIComponent(errorCode) +
          "&url=" +
          encodeURIComponent(validatedURL)
      );
    }
  }
);

webviews.bindEvent("crashed", (tabId, isKilled) => {
  const url = tasks.tabs.get(tabId).url;

  tasks.tabs.update(tabId, {
    url:
      webviews.internalPages.error + "?ec=crash&url=" + encodeURIComponent(url),
  });

  // the existing process has crashed, so we can't reuse it
  webviews.destroy(tabId);
  webviews.add(tabId);

  if (tabId === tasks.tabs.getSelected()) {
    webviews.setSelected(tabId);
  }
});

webviews.bindIPC("getSettingsData", (tabId, args) => {
  if (!urlParser.isInternalURL(tasks.tabs.get(tabId).url)) {
    throw new Error();
  }
  webviews.callAsync(tabId, "send", ["receiveSettingsData", settings.list]);
});

webviews.bindIPC("setSetting", (tabId, args) => {
  if (!urlParser.isInternalURL(tasks.tabs.get(tabId).url)) {
    throw new Error();
  }
  settings.set(args[0].key, args[0].value);
});

settings.listen(() => {
  tasks.forEach((task) => {
    task.tabs.forEach((tab) => {
      if (tab.url.startsWith("file://")) {
        try {
          webviews.callAsync(tab.id, "send", [
            "receiveSettingsData",
            settings.list,
          ]);
        } catch (e) {
          // webview might not actually exist
        }
      }
    });
  });
});

webviews.bindIPC("scroll-position-change", (tabId, args) => {
  tasks.tabs.update(tabId, {
    scrollPosition: args[0],
  });
});

ipc.on("view-event", (e, args) => {
  webviews.emitEvent(args.event, args.viewId, args.args);
});

ipc.on("async-call-result", (e, args) => {
  webviews.asyncCallbacks[args.callId](args.error, args.result);
  delete webviews.asyncCallbacks[args.callId];
});

ipc.on("view-ipc", (e, args) => {
  if (!webviews.viewList.includes(args.id)) {
    // the view could have been destroyed between when the event was occured and when it was recieved in the UI process, see https://github.com/minbrowser/min/issues/604#issuecomment-419653437
    return;
  }
  webviews.IPCEvents.forEach((item) => {
    if (item.name === args.name) {
      item.fn(args.id, [args.data], args.frameId);
    }
  });
});

setInterval(() => {
  captureCurrentTab();
}, 15000);

ipc.on("captureData", (e, data) => {
  tasks.tabs.update(data.id, { previewImage: data.url });
  if (
    data.id === webviews.selectedId &&
    webviews.placeholderRequests.length > 0
  ) {
    placeholderImg.src = data.url;
    placeholderImg.hidden = false;
  }
});

/* focus the view when the window is focused */

ipc.on("windowFocus", () => {
  if (
    webviews.placeholderRequests.length === 0 &&
    document.activeElement?.tagName !== "INPUT"
  ) {
    webviews.focus();
  }
});

export default webviews;
