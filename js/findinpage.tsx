import webviews from "./webviews";
import * as keybindings from "./keybindings";
// import { pdfViewer } from "./pdfViewer";

import { l } from "../localization";
import { tasks } from "./tabState";
// import { createStore } from "solid-js/store";

// const [state, setState] = createStore({
//   hidden: true,
//   count: 0,
// });

// let findInput: HTMLInputElement;

// export const start = () => {
//   setState({hidden: false, count: 0})
//   webviews.releaseFocus();

//   findInput?.focus();
//   findInput?.select();

//   const activeTab = tasks.tabs.getSelected();
//   if (findInput.value) {
//     webviews.callAsync(activeTab, "findInPage", findInput.value);
//   }
// };

// const end = (options?: any) => {
//   options = options || {};
//   const action = options.action || "keepSelection";

//   setState("hidden", true)

//   if (this.activeTab) {
//     webviews.callAsync(this.activeTab, "stopFindInPage", action);

//     /* special case for PDF viewer */
//     // if (
//     //   tasks.tabs.get(this.activeTab) &&
//     //   pdfViewer.isPDFViewer(this.activeTab)
//     // ) {
//     //   pdfViewer.endFindInPage(this.activeTab);
//     // }

//     webviews.callAsync(this.activeTab, "focus");
//   }

//   this.activeTab = null;
// }

// export const FindInPage = () => {
//   return (
//     <div
//       id="findinpage-bar"
//       hidden={state.hidden}
//       class="theme-background-color theme-text-color"
//     >
//       <input
//         class="mousetrap"
//         id="findinpage-input"
//         placeholder={l("searchInPage")}
//       />
//       <span id="findinpage-count" class="inline-text">
//         {state.count}
//       </span>
//       <div class="divider" />
//       <button id="findinpage-previous-match">
//         <i class="i carbon:chevron-up navbar-action-button"></i>
//       </button>
//       <button id="findinpage-next-match">
//         <i class="i carbon:chevron-down navbar-action-button"></i>
//       </button>
//       <div class="divider"></div>
//       <button id="findinpage-end">
//         <i class="i carbon:close navbar-action-button"></i>
//       </button>
//     </div>
//   );
// };

class Findinpage {
  public container = document.getElementById(
    "findinpage-bar"
  ) as HTMLDivElement;
  public input = document.getElementById(
    "findinpage-input"
  ) as HTMLInputElement;
  public counter = document.getElementById(
    "findinpage-count"
  ) as HTMLDivElement;
  public previous = document.getElementById(
    "findinpage-previous-match"
  ) as HTMLDivElement;
  public next = document.getElementById(
    "findinpage-next-match"
  ) as HTMLDivElement;
  public endButton = document.getElementById(
    "findinpage-end"
  ) as HTMLButtonElement;
  public activeTab: any = null;

  public start(options?: any) {
    webviews.releaseFocus();

    this.input.placeholder = l("searchInPage");

    this.activeTab = tasks.tabs.getSelected();

    this.counter.textContent = "";
    this.container.hidden = false;
    this.input.focus();
    this.input.select();

    if (this.input.value) {
      webviews.callAsync(this.activeTab, "findInPage", this.input.value);
    }
  }

  public end(options?: any) {
    options = options || {};
    var action = options.action || "keepSelection";

    this.container.hidden = true;

    if (this.activeTab) {
      webviews.callAsync(this.activeTab, "stopFindInPage", action);
      webviews.callAsync(this.activeTab, "focus");
    }

    this.activeTab = null;
  }
}

const findinpage = new Findinpage();

findinpage.input.addEventListener("click", () => {
  webviews.releaseFocus();
});

findinpage.endButton.addEventListener("click", () => {
  findinpage.end();
});

findinpage.input.addEventListener("input", (e) => {
  if (findinpage.input.value) {
    webviews.callAsync(
      findinpage.activeTab,
      "findInPage",
      findinpage.input.value
    );
  }
});

findinpage.input.addEventListener("keypress", (e) => {
  if (e.keyCode === 13) {
    // Return/Enter key
    webviews.callAsync(findinpage.activeTab, "findInPage", [
      findinpage.input.value,
      {
        forward: !e.shiftKey, // find previous if Shift is pressed
        findNext: false,
      },
    ]);
  }
});

findinpage.previous.addEventListener("click", (e) => {
  webviews.callAsync(findinpage.activeTab, "findInPage", [
    findinpage.input.value,
    {
      forward: false,
      findNext: false,
    },
  ]);
  findinpage.input.focus();
});

findinpage.next.addEventListener("click", (e) => {
  webviews.callAsync(findinpage.activeTab, "findInPage", [
    findinpage.input.value,
    {
      forward: true,
      findNext: false,
    },
  ]);
  findinpage.input.focus();
});

webviews.bindEvent("view-hidden", (tabId) => {
  if (tabId === findinpage.activeTab) {
    findinpage.end();
  }
});

webviews.bindEvent(
  "did-start-navigation",
  (tabId, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
    if (!isInPlace && tabId === findinpage.activeTab) {
      findinpage.end();
    }
  }
);

webviews.bindEvent("found-in-page", (tabId, data) => {
  if (data.matches !== undefined) {
    const text =
      data.matches === 1 ? l("findMatchesSingular") : l("findMatchesPlural");
    // if (data.matches === 1) {
    //   text = l("findMatchesSingular");
    // } else {
    //   text = l("findMatchesPlural");
    // }

    findinpage.counter.textContent = text
      .replace("%i", data.activeMatchOrdinal)
      .replace("%t", data.matches);
  }
});

keybindings.defineShortcut("followLink", () => {
  findinpage.end({ action: "activateSelection" });
});

keybindings.defineShortcut({ keys: "esc" }, (e) => {
  findinpage.end();
});

export default findinpage;
