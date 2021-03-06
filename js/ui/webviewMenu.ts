// @ts-check

import { clipboard, ipcRenderer as ipc } from "electron";

import webviews from "./webviewUtils";
import * as browserUI from "./browserUI";
import { searchEngine } from "./searchEngine/renderer";
// import userscripts from "./userscripts";
import settings from "./settings/settings";

import * as remoteMenu from "./shared/remoteMenuRenderer";

import { l } from "../../localization";
import { currentTab, createNewTab } from "./store";
// const { tasks } = require("./tabState");

class WebviewMenu {
  public menuData = null;
  public showMenu(data, extraData) {
    // data comes from a context-menu event
    // const currentTab = tasks.tabs.get(tasks.tabs.getSelected());

    const menuSections: any[] = [];

    const openInBackground = !settings.get("openTabsInForeground");

    /* Picture in Picture */

    if (extraData.hasVideo) {
      menuSections.push([
        {
          label: l("pictureInPicture"),
          click: () => {
            webviews.callAsync(currentTab().id, "send", [
              "enterPictureInPicture",
              { x: data.x, y: data.y },
            ]);
          },
        },
      ]);
    }

    /* Spellcheck */

    if (data.misspelledWord) {
      var suggestionEntries = data.dictionarySuggestions
        .slice(0, 3)
        .map((suggestion) => {
          return {
            label: suggestion,
            click: () => {
              webviews.callAsync(
                currentTab().id,
                "replaceMisspelling",
                suggestion
              );
            },
          };
        });

      // https://www.electronjs.org/docs/api/session#sesaddwordtospellcheckerdictionaryword
      // "This API will not work on non-persistent (in-memory) sessions"
      if (!currentTab().private) {
        suggestionEntries.push({
          label: l("addToDictionary"),
          click: function () {
            ipc.invoke("addWordToSpellCheckerDictionary", data.misspelledWord);
          },
        });
      }

      if (suggestionEntries.length > 0) {
        menuSections.push(suggestionEntries);
      }
    }

    /* links */

    let link = data.linkURL;

    // show link items for embedded frames, but not the top-level page (which will also be listed as a frameURL)
    if (!link && data.frameURL && data.frameURL !== currentTab().url) {
      link = data.frameURL;
    }

    if (link === "about:srcdoc") {
      /* srcdoc is used in reader view, but it can't actually be opened anywhere outside of the reader page */
      link = null;
    }

    const mediaURL = data.srcURL;

    if (link) {
      var linkActions: any[] = [
        {
          label: link.length > 60 ? link.substring(0, 60) + "..." : link,
          enabled: false,
        },
      ];

      if (!currentTab().private) {
        linkActions.push({
          label: l("openInNewTab"),
          click: () => {
            browserUI.addTab(createNewTab({ url: link }), {
              enterEditMode: false,
              openInBackground: openInBackground,
            });
          },
        });
      }

      linkActions.push({
        label: l("openInNewPrivateTab"),
        click: () => {
          browserUI.addTab(createNewTab({ url: link, private: true }), {
            enterEditMode: false,
            openInBackground: openInBackground,
          });
        },
      });

      linkActions.push({
        label: l("saveLinkAs"),
        click: () => {
          ipc.invoke("downloadURL", link);
        },
      });

      menuSections.push(linkActions);
    } else if (mediaURL && data.mediaType === "image") {
      /* images */
      /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */

      const imageActions: any[] = [
        {
          label:
            mediaURL.length > 60 ? mediaURL.substring(0, 60) + "..." : mediaURL,
          enabled: false,
        },
      ];

      imageActions.push({
        label: l("viewImage"),
        click: () => {
          webviews.update(currentTab().id, mediaURL);
        },
      });

      if (!currentTab().private) {
        imageActions.push({
          label: l("openImageInNewTab"),
          click: () => {
            browserUI.addTab(createNewTab({ url: mediaURL }), {
              enterEditMode: false,
              openInBackground: openInBackground,
            });
          },
        });
      }

      imageActions.push({
        label: l("openImageInNewPrivateTab"),
        click: () => {
          browserUI.addTab(createNewTab({ url: mediaURL, private: true }), {
            enterEditMode: false,
            openInBackground: openInBackground,
          });
        },
      });

      menuSections.push(imageActions);

      menuSections.push([
        {
          label: l("saveImageAs"),
          click: function () {
            ipc.invoke("downloadURL", mediaURL);
          },
        },
      ]);
    }

    /* selected text */

    const selection = data.selectionText;

    if (selection) {
      menuSections.push([
        {
          label: l("searchWith").replace("%s", searchEngine.getCurrent().name),
          click: () => {
            const newTab = createNewTab({
              url: searchEngine
                .getCurrent()
                .searchURL.replace("%s", encodeURIComponent(selection)),
              private: currentTab().private,
            });
            browserUI.addTab(newTab, {
              enterEditMode: false,
              openInBackground: false,
            });
          },
        },
      ]);
    }

    const clipboardActions: any[] = [];

    if (mediaURL && data.mediaType === "image") {
      clipboardActions.push({
        label: l("copy"),
        click: () => {
          webviews.callAsync(currentTab().id, "copyImageAt", [data.x, data.y]);
        },
      });
    } else if (selection) {
      clipboardActions.push({
        label: l("copy"),
        click: () => {
          webviews.callAsync(currentTab().id, "copy");
        },
      });
    }

    if (data.editFlags && data.editFlags.canPaste) {
      clipboardActions.push({
        label: l("paste"),
        click: () => {
          webviews.callAsync(currentTab().id, "paste");
        },
      });
    }

    if (link || (mediaURL && !mediaURL.startsWith("blob:"))) {
      if (link && link.startsWith("mailto:")) {
        const ematch = link.match(/(?<=mailto:)[^\?]+/);
        if (ematch) {
          clipboardActions.push({
            label: l("copyEmailAddress"),
            click: () => {
              clipboard.writeText(ematch[0]);
            },
          });
        }
      } else {
        clipboardActions.push({
          label: l("copyLink"),
          click: () => {
            clipboard.writeText(link || mediaURL);
          },
        });
      }
    }

    if (clipboardActions.length !== 0) {
      menuSections.push(clipboardActions);
    }

    const navigationActions = [
      {
        label: l("goBack"),
        click: () => {
          try {
            webviews.goBackIgnoringRedirects(currentTab().id);
          } catch (e) {}
        },
      },
      {
        label: l("goForward"),
        click: () => {
          try {
            webviews.callAsync(currentTab().id, "goForward");
          } catch (e) {}
        },
      },
    ];

    menuSections.push(navigationActions);

    /* inspect element */
    menuSections.push([
      {
        label: l("inspectElement"),
        click: () => {
          webviews.callAsync(currentTab().id, "inspectElement", [
            data.x || 0,
            data.y || 0,
          ]);
        },
      },
    ]);

    /* Userscripts */

    // const contextMenuScripts = userscripts
    //   .getMatchingScripts(tasks.tabs.get(tasks.tabs.getSelected()).url)
    //   .filter((script) => {
    //     if (
    //       script.options["run-at"] &&
    //       script.options["run-at"].includes("context-menu")
    //     ) {
    //       return true;
    //     }
    //   });

    // if (contextMenuScripts.length > 0) {
    //   const scriptActions: any = [
    //     {
    //       label: l("runUserscript"),
    //       enabled: false,
    //     },
    //   ];
    //   contextMenuScripts.forEach((script) => {
    //     scriptActions.push({
    //       label: script.name,
    //       click: () => {
    //         userscripts.runScript(tasks.tabs.getSelected(), script);
    //       },
    //     });
    //   });
    //   menuSections.push(scriptActions);
    // }

    // var translateMenu = {
    //   label: 'Translate Page (Beta)',
    //   submenu: []
    // }

    // translateMenu.submenu.push({
    //   type: 'separator'
    // })

    // translateMenu.submenu.push({
    //   label: 'Send Feedback',
    //   click: function () {
    //     browserUI.addTab(tasks.tabs.add({ url: 'https://github.com/minbrowser/min/issues/new?title=Translation%20feedback%20for%20' + encodeURIComponent(tasks.tabs.get(tasks.tabs.getSelected()).url) }), { enterEditMode: false, openInBackground: false })
    //   }
    // })

    // menuSections.push([translateMenu])

    // Electron's default menu position is sometimes wrong on Windows with a touchscreen
    // https://github.com/minbrowser/min/issues/903
    const offset = webviews.getViewBounds();
    remoteMenu.open(menuSections, data.x + offset.x, data.y + offset.y);
  }

  constructor() {
    webviews.bindEvent("context-menu", (tabId, data) => {
      this.menuData = data;
      webviews.callAsync(currentTab().id, "send", [
        "getContextMenuData",
        { x: data.x, y: data.y },
      ]);
    });
    webviews.bindIPC("contextMenuData", (tabId, args) => {
      this.showMenu(this.menuData, args[0]);
      this.menuData = null;
    });
  }
}

const webviewMenu = new WebviewMenu();

export default webviewMenu;
