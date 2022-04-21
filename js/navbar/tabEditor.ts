import { searchbar } from "../searchbar/searchbar";
import webviews from "../webviews";
import modalMode from "../modalMode";
import { urlParser } from "../util/urlParser";
import keyboardNavigationHelper from "../util/keyboardNavigationHelper";
import { bookmarkStar } from "./bookmarkStar";
import { contentBlockingToggle } from "./contentBlockingToggle";

import { l } from "../../localization";
import { tasks } from "../tabState";

class TabEditor {
  public container = document.getElementById("tab-editor") as HTMLDivElement;
  public input = document.getElementById(
    "tab-editor-input"
  ) as HTMLInputElement;
  public contentBlockingToggle: any;
  public star: any = null;

  public show(tabId, editingValue?: string | null, showSearchbar?: boolean) {
    /* Edit mode is not available in modal mode. */
    if (modalMode.enabled()) {
      return;
    }

    this.container.hidden = false;

    bookmarkStar.update(tabId, this.star);
    contentBlockingToggle.update(tabId, this.contentBlockingToggle);

    webviews.requestPlaceholder("editMode");

    document.body.classList.add("is-edit-mode");

    let currentURL = urlParser.getSourceURL(tasks.tabs.get(tabId).url);
    if (currentURL === "min://newtab") {
      currentURL = "";
    }

    this.input.value = editingValue || currentURL;
    this.input.focus();
    if (!editingValue) {
      this.input.select();
    }
    // https://github.com/minbrowser/min/discussions/1506
    this.input.scrollLeft = 0;

    searchbar.show(this.input);

    if (showSearchbar !== false) {
      if (editingValue) {
        searchbar.showResults(editingValue, null);
      } else {
        searchbar.showResults("", null);
      }
    }

    /* animation */
    if (tasks.tabs.count() > 1) {
      requestAnimationFrame(() => {
        const item = document.querySelector(
          `.tab-item[data-tab="${tabId}"]`
        ) as HTMLDivElement;
        const originCoordinates = item.getBoundingClientRect();

        const finalCoordinates = (
          document.querySelector("#tabs") as HTMLDivElement
        ).getBoundingClientRect();

        const translateX = Math.min(
          Math.round(originCoordinates.x - finalCoordinates?.x) * 0.45,
          window.innerWidth
        );

        this.container.style.opacity = "0";
        this.container.style.transform = `translateX(${translateX}px)`;
        requestAnimationFrame(() => {
          this.container.style.transition = "0.800s all";
          this.container.style.opacity = "1";
          this.container.style.transform = "";
        });
      });
    }
  }

  public hide() {
    this.container.hidden = true;
    this.container.removeAttribute("style");

    this.input.blur();
    searchbar.hide();

    document.body.classList.remove("is-edit-mode");

    webviews.hidePlaceholder("editMode");
  }

  constructor() {
    this.input.setAttribute("placeholder", l("searchbarPlaceholder"));

    this.star = bookmarkStar.create();
    this.container.appendChild(this.star);

    this.contentBlockingToggle = contentBlockingToggle.create();
    this.container.appendChild(this.contentBlockingToggle);

    keyboardNavigationHelper.addToGroup("searchbar", this.container);

    // keypress doesn't fire on delete key - use keyup instead
    this.input.addEventListener("keyup", (e) => {
      if (e.keyCode === 8) {
        searchbar.showResults(this.input.value, e);
      }
    });

    this.input.addEventListener("keypress", (e) => {
      if (e.keyCode === 13) {
        // return key pressed; update the url
        if (
          this.input.getAttribute("data-autocomplete") &&
          this.input.getAttribute("data-autocomplete")?.toLowerCase() ===
            this.input.value.toLowerCase()
        ) {
          // special case: if the typed input is capitalized differently from the actual URL that was autocompleted (but is otherwise the same), then we want to open the actual URL instead of what was typed.
          // see https://github.com/minbrowser/min/issues/314#issuecomment-276678613
          searchbar.openURL(this.input.getAttribute("data-autocomplete")!, e);
        } else {
          searchbar.openURL(this.input.value, e);
        }
      } else if (e.keyCode === 9) {
        return;
        // tab key, do nothing - in keydown listener
      } else if (e.keyCode === 16) {
        return;
        // shift key, do nothing
      } else if (e.keyCode === 8) {
        return;
        // delete key is handled in keyUp
      } else {
        // show the searchbar
        searchbar.showResults(this.input.value, e);
      }

      // on keydown, if the autocomplete result doesn't change, we move the selection instead of regenerating it to avoid race conditions with typing. Adapted from https://github.com/patrickburke/jquery.inlineComplete

      const v = e.key;
      const sel = this.input.value
        .substring(this.input.selectionStart!, this.input.selectionEnd!)
        .indexOf(v);

      if (v && sel === 0) {
        (this.input.selectionStart as number) += 1;
        e.preventDefault();
      }
    });

    document.getElementById("webviews")?.addEventListener("click", () => {
      this.hide();
    });
  }
}

const tabEditor = new TabEditor();

export default tabEditor;
