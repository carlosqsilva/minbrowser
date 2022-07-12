import { clipboard } from "electron";
import * as remoteMenu from "./shared/remoteMenuRenderer";

import { searchBarOpenURL } from "./searchbar";
import { l } from "../../localization";

interface MenuItem {
  label: string;
  role?: string;
  click?: () => void;
}

type MenuGroup = MenuItem[][];

(() => {
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

    let node = e.target as HTMLElement;

    while (node) {
      if (
        node.nodeName.match(/^(input|textarea)$/i) ||
        node.isContentEditable
      ) {
        if (node.id === "tab-editor-input") {
          inputMenu[1].push({
            label: l("pasteAndGo"),
            click: () => {
              searchBarOpenURL(clipboard.readText());
            },
          });
        }
        remoteMenu.open(inputMenu);
        break;
      }

      node = node.parentNode as HTMLElement;
    }
  });
})();
