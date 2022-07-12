// @ts-check

import type {
  KeyboardEvent,
  MenuItem,
  WebContents,
} from "electron";
import { app, Menu, webContents } from "electron";

// import settings from "../js/util/settings/settingsMain";
import { destroyAllViews } from "./viewManager";
import { getMainWindow, sendIPCToWindow } from "./window";
import { l } from "../localization";

export function createAppMenu() {
  function openTabInWindow(url: string) {
    sendIPCToWindow("addTab", {
      url: url,
    });
  }

  const quitAction: Partial<MenuItem> = {
    label: l("appMenuQuit").replace("%n", app.name),
    accelerator: "CmdOrCtrl+Q",
    click: (_item, _window, event: KeyboardEvent) => {
      if (!event.triggeredByAccelerator) {
        app.quit();
      }
    },
  };

  const preferencesAction = {
    label: l("appMenuPreferences"),
    accelerator: "CmdOrCtrl+,",
    click: () => {
      sendIPCToWindow("addTab", {
        url: "file://" + __dirname + "/pages/settings/index.html",
      });
    },
  };

  const template = [
    {
      label: app.name,
      submenu: [
        {
          label: l("appMenuAbout").replace("%n", app.name),
          role: "about",
        },
        {
          type: "separator",
        },
        preferencesAction,
        {
          label: "Services",
          role: "services",
          submenu: [],
        },
        {
          type: "separator",
        },
        {
          label: l("appMenuHide").replace("%n", app.name),
          accelerator: "Command+H",
          role: "hide",
        },
        {
          label: l("appMenuHideOthers"),
          accelerator: "CmdOrCtrl+Alt+H",
          role: "hideothers",
        },
        {
          label: l("appMenuShowAll"),
          role: "unhide",
        },
        {
          type: "separator",
        },
        quitAction,
      ],
    },
    {
      label: l('appMenuEdit'),
      submenu: [
        {
          label: l('appMenuUndo'),
          accelerator: 'Command+Z',
          role: 'undo'
        },
        {
          label: l('appMenuRedo'),
          accelerator: 'Shift+Command+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuCut'),
          accelerator: 'Command+X',
          role: 'cut'
        },
        {
          label: l('appMenuCopy'),
          accelerator: 'Command+C',
          role: 'copy'
        },
        {
          label: l('appMenuPaste'),
          accelerator: 'Command+V',
          role: 'paste'
        },
        {
          label: l('appMenuSelectAll'),
          accelerator: 'Command+A',
          role: 'selectall'
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuFind'),
          accelerator: 'Command+F',
          click: () => {
            console.log("asasas")
            sendIPCToWindow('findInPage')
          }
        },
      ]
    },
    {
      label: l("appMenuWindow"),
      role: "window",
      submenu: [
        {
          label: l("appMenuMinimize"),
          accelerator: "CmdOrCtrl+M",
          role: "minimize",
        },
        {
          label: l("appMenuClose"),
          accelerator: "CmdOrCtrl+W",
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isFocused()) {
              // a devtools window is focused, close it
              const contents = webContents.getAllWebContents();
              for (const content of contents) {
                if (content.isDevToolsFocused()) {
                  content.closeDevTools();
                  return;
                }
              }
            }
            // otherwise, this event will be handled in the main window
          },
        },
        // {
        //   label: l("appMenuAlwaysOnTop"),
        //   type: "checkbox",
        //   checked: settings.get("windowAlwaysOnTop") || false,
        //   click: (item: MenuItem) => {
        //     const mainWindow = getMainWindow();
        //     if (mainWindow) {
        //       mainWindow.setAlwaysOnTop(item.checked);
        //     }
        //     settings.set("windowAlwaysOnTop", item.checked);
        //   },
        // },
        {
          type: "separator",
        },
        {
          label: l("appMenuBringToFront"),
          role: "front",
        },
      ],
    },
    {
      label: l("appMenuDeveloper"),
      submenu: [
        {
          label: l("appMenuInspectPage"),
          accelerator: "Cmd+Alt+I",
          click: () => {
            sendIPCToWindow("inspectPage");
          },
        },
        {
          type: "separator",
        },
        {
          label: l("appMenuReloadBrowser"),
          accelerator: undefined,
          click: (_, focusedWindow: WebContents) => {
            if (focusedWindow) {
              destroyAllViews();
              focusedWindow.reload();
            }
          },
        },
        {
          label: l("appMenuInspectBrowser"),
          accelerator: "Shift+Cmd+Alt+I",
          click: (_, focusedWindow: WebContents) => {
            if (focusedWindow) focusedWindow.toggleDevTools();
          },
        },
      ],
    },
    {
      label: l("appMenuHelp"),
      role: "help",
      submenu: [
        {
          label: l("appMenuKeyboardShortcuts"),
          click: () => {
            openTabInWindow(
              "https://github.com/minbrowser/min/wiki#keyboard-shortcuts"
            );
          },
        },
        {
          label: l("appMenuReportBug"),
          click: () => {
            openTabInWindow("https://github.com/minbrowser/min/issues/new");
          },
        },
        {
          label: l("appMenuTakeTour"),
          click: () => {
            openTabInWindow("https://minbrowser.github.io/min/tour/");
          },
        },
        {
          label: l("appMenuViewGithub"),
          click: () => {
            openTabInWindow("https://github.com/minbrowser/min");
          },
        },
      ],
    },
  ];

  return Menu.setApplicationMenu(
    // @ts-ignore
    Menu.buildFromTemplate(template)
  );
}

export function createDockMenu() {
  // create the menu. based on example from https://github.com/electron/electron/blob/master/docs/tutorial/desktop-environment-integration.md#custom-dock-menu-macos
  app.dock.setMenu(
    Menu.buildFromTemplate([
      {
        label: l("appMenuNewTab"),
        click: function (item, window) {
          sendIPCToWindow("addTab");
        },
      },
      {
        label: l("appMenuNewPrivateTab"),
        click: function (item, window) {
          sendIPCToWindow("addPrivateTab");
        },
      },
      {
        label: l("appMenuNewTask"),
        click: function (item, window) {
          sendIPCToWindow("addTask");
        },
      },
    ])
  );
}
