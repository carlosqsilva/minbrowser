/*
Passes a context menu template to the main process (where the menu is created)
and listens for click events on it.
*/

import { ipcRenderer as ipc } from "electron";

const menuCallbacks = {};

let nextMenuId = 0;

export const open = (menuTemplate, x?: number, y?: number) => {
  nextMenuId++;
  menuCallbacks[nextMenuId] = {};
  let nextItemId = 0;

  const prepareToSend = (menuPart) => {
    if (Array.isArray(menuPart)) {
      return menuPart.map((item) => prepareToSend(item));
    }
    if (menuPart.submenu) {
      menuPart.submenu = prepareToSend(menuPart.submenu);
    }

    if (typeof menuPart.click === "function") {
      menuCallbacks[nextMenuId][nextItemId] = menuPart.click;
      menuPart.click = nextItemId;
      nextItemId++;
    }

    return menuPart;
  };

  ipc.send("open-context-menu", {
    id: nextMenuId,
    template: prepareToSend(menuTemplate),
    x,
    y,
  });
};

ipc.on("context-menu-item-selected", (e, data) => {
  menuCallbacks[data.menuId][data.itemId]();
});

ipc.on("context-menu-will-close", (e, data) => {
  // delay close event until after selected event has been received
  setTimeout(() => {
    delete menuCallbacks[data.menuId];
  }, 16);
});
