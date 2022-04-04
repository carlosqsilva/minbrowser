/* imports common modules */

import { ipcRenderer as ipc } from "electron"

const propertiesToClone = [
  "deltaX",
  "deltaY",
  "metaKey",
  "ctrlKey",
  "defaultPrevented",
  "clientX",
  "clientY",
];

function cloneEvent(e) {
  const obj = {};
  for (const prop of propertiesToClone) {
    obj[prop] = e[prop];
  }
  return JSON.stringify(obj);
}

// workaround for Electron bug
setTimeout(() => {
  /* Used for swipe gestures */
  window.addEventListener("wheel", (e) => {
    ipc.send("wheel-event", cloneEvent(e));
  });

  let scrollTimeout = null;

  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        ipc.send("scroll-position-change", Math.round(window.scrollY));
      }, 200);
    },
    { passive: true }
  );
}, 0);

/* Used for picture in picture item in context menu */
ipc.on("getContextMenuData", (e, data) => {
  // check for video element to show picture-in-picture menu
  const hasVideo = Array.from(document.elementsFromPoint(data.x, data.y)).some(
    (el) => el.tagName === "VIDEO"
  );
  ipc.send("contextMenuData", { hasVideo });
});

ipc.on("enterPictureInPicture", (e, data) => {
  const [video] = Array.from(document.elementsFromPoint(data.x, data.y)).filter(
    (el) => el.tagName === "VIDEO"
  );
  if (video) video.requestPictureInPicture();
});

window.addEventListener("message", (e) => {
  if (!e.origin.startsWith("file://")) {
    return;
  }

  if (e.data && e.data.message && e.data.message === "showCredentialList") {
    ipc.send("showCredentialList");
  }
});
