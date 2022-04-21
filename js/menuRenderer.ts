/* Handles messages that get sent from the menu bar in the main process */
import { ipcRenderer as ipc } from "electron";

import { tasks } from "./tabState";
import webviews from "./webviews";
// import webviewGestures from './webviewGestures'
import * as browserUI from "./browserUI";
import * as focusmode from "./focusMode";
import modalMode from "./modalMode";
import findinpage from "./findinpage";
// const PDFViewer = require("./pdfViewer.js");
// const tabEditor = require("./navbar/tabEditor.js");
// const readerView = require("./readerView.js");
// const taskOverlay = require("./taskOverlay/taskOverlay.js");

(() => {
  ipc.on("inspectPage", () => {
    webviews.callAsync(tasks.tabs.getSelected()!, "toggleDevTools");
  });

  ipc.on("findInPage", () => {
    /* Page search is not available in modal mode. */
    if (modalMode.enabled()) {
      return;
    }

    findinpage.start();
  });

  ipc.on("addTab", (e, data) => {
    /* new tabs can't be created in modal mode */
    if (modalMode.enabled()) {
      return;
    }

    /* new tabs can't be created in focus mode */
    if (focusmode.isEnabled()) {
      focusmode.focusModeWarn();
      return;
    }

    const newTab = tasks.tabs.add({
      url: data.url || "",
    });

    browserUI.addTab(newTab, {
      enterEditMode: !data.url, // only enter edit mode if the new tab is empty
    });
  });

  ipc.on("addPrivateTab", () => {
    /* new tabs can't be created in modal mode */
    if (modalMode.enabled()) {
      return;
    }

    /* new tabs can't be created in focus mode */
    if (focusmode.isEnabled()) {
      focusmode.focusModeWarn();
      return;
    }

    browserUI.addTab(
      tasks.tabs.add({
        private: true,
      })
    );
  });
})();

// export default {
//   initialize: function () {
//     ipc.on("inspectPage", function () {
//       webviews.callAsync(tasks.tabs.getSelected(), "toggleDevTools");
//     });

// ipc.on('openEditor', function () {
//   tabEditor.show(tasks.tabs.getSelected())
// })

// ipc.on('showBookmarks', function () {
//   tabEditor.show(tasks.tabs.getSelected(), '!bookmarks ')
// })

// ipc.on('showHistory', function () {
//   tabEditor.show(tasks.tabs.getSelected(), '!history ')
// })

// ipc.on('duplicateTab', function (e) {
//   if (modalMode.enabled()) {
//     return
//   }

//   if (focusMode.enabled()) {
//     focusMode.warn()
//     return
//   }

//   browserUI.duplicateTab(tasks.tabs.getSelected())
// })

// ipc.on("addTab", (e, data) => {
//   /* new tabs can't be created in modal mode */
//   if (modalMode.enabled()) {
//     return;
//   }

//   /* new tabs can't be created in focus mode */
//   if (focusmode.isEnabled()) {
//     focusmode.focusModeWarn();
//     return;
//   }

//   const newTab = tasks.tabs.add({
//     url: data.url || "",
//   });

//   browserUI.addTab(newTab, {
//     enterEditMode: !data.url, // only enter edit mode if the new tab is empty
//   });
// });

// ipc.on('saveCurrentPage', async function () {
//   var currentTab = tasks.tabs.get(tasks.tabs.getSelected())

//   // new tabs cannot be saved
//   if (!currentTab.url) {
//     return
//   }

//   // if the current tab is a PDF, let the PDF viewer handle saving the document
//   if (PDFViewer.isPDFViewer(tasks.tabs.getSelected())) {
//     PDFViewer.savePDF(tasks.tabs.getSelected())
//     return
//   }

//   if (tasks.tabs.get(tasks.tabs.getSelected()).isFileView) {
//     webviews.callAsync(tasks.tabs.getSelected(), 'downloadURL', [tasks.tabs.get(tasks.tabs.getSelected()).url])
//   } else {
//     var savePath = await ipc.invoke('showSaveDialog', {
//       defaultPath: currentTab.title.replace(/[/\\]/g, '_')
//     })

//     // savePath will be undefined if the save dialog is canceled
//     if (savePath) {
//       if (!savePath.endsWith('.html')) {
//         savePath = savePath + '.html'
//       }
//       webviews.callAsync(tasks.tabs.getSelected(), 'savePage', [savePath, 'HTMLComplete'])
//     }
//   }
// })

// ipc.on('toggleTaskOverlay', function () {
//   taskOverlay.toggle()
// })

// ipc.on('goBack', function () {
//   webviews.callAsync(tasks.tabs.getSelected(), 'goBack')
// })

// ipc.on('goForward', function () {
//   webviews.callAsync(tasks.tabs.getSelected(), 'goForward')
// })
//   },
// };
