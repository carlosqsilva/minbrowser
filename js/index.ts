import { ipcRenderer as ipc } from "electron";

if (navigator.maxTouchPoints > 0) {
  document.body.classList.add("touch");
}

/* add classes so that the window state can be used in CSS */
ipc.on("enter-full-screen", () => {
  document.body.classList.add("fullscreen");
});

ipc.on("leave-full-screen", () => {
  document.body.classList.remove("fullscreen");
});

ipc.on("maximize", () => {
  document.body.classList.add("maximized");
});

ipc.on("unmaximize", () => {
  document.body.classList.remove("maximized");
});

/* prevent a click event from firing after dragging the window */

window.addEventListener("load", () => {
  let isMouseDown = false;
  let isDragging = false;
  let distance = 0;

  document.body.addEventListener("mousedown", () => {
    isMouseDown = true;
    isDragging = false;
    distance = 0;
  });

  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  const dragHandles = document.getElementsByClassName("windowDragHandle");

  for (let i = 0; i < dragHandles.length; i++) {
    dragHandles[i].addEventListener("mousemove", (e) => {
      if (isMouseDown) {
        isDragging = true;
        distance +=
          Math.abs((e as MouseEvent).movementX) +
          Math.abs((e as MouseEvent).movementY);
      }
    });
  }

  document.body.addEventListener(
    "click",
    (e) => {
      if (isDragging && distance >= 10.0) {
        e.stopImmediatePropagation();
        isDragging = false;
      }
    },
    true
  );
});

import "./ui/store"
import "./ui/browserUI"
import "./ui/settings/settings";
import "./ui/theme/renderer";

import "./ui"

