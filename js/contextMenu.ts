// @ts-check

import { clipboard } from "electron";
import * as remoteMenu from "./remoteMenuRenderer";

import { searchbar } from "./searchbar/searchbar";
import { l } from "../localization";

interface MenuItem {
  label: string;
  role?: string;
  click?: () => void;
}

type MenuGroup = MenuItem[][];

(function initialize() {
  document.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const inputMenu: MenuGroup = [
      [
        {
          label: l("undo"),
          role: "undo",
        },
        {
          label: l("redo"),
          role: "redo",
        },
      ],
      [
        {
          label: l("cut"),
          role: "cut",
        },
        {
          label: l("copy"),
          role: "copy",
        },
        {
          label: l("paste"),
          role: "paste",
        },
      ],
      [
        {
          label: l("selectAll"),
          role: "selectall",
        },
      ],
    ];

    let node = e.target;

    while (node) {
      if (
        // @ts-ignore
        node.nodeName.match(/^(input|textarea)$/i) ||
        // @ts-ignore
        node.isContentEditable
      ) {
        // @ts-ignore
        if (node.id === "tab-editor-input") {
          inputMenu[1].push({
            label: l("pasteAndGo"),
            click: () => {
              searchbar.openURL(clipboard.readText());
            },
          });
        }
        remoteMenu.open(inputMenu);
        break;
      }
      // @ts-ignore
      node = node.parentNode;
    }
  });
})();
