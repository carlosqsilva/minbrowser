import { onMount } from "solid-js";
import { createStore } from "solid-js/store";

import { currentTab } from "./store";
import webviews from "./webviewUtils";
import { defineShortcut } from "./keybindings";

import { l } from "../../localization";

interface State {
  hidden: boolean;
  count?: string;
}

const [state, setState] = createStore<State>({
  hidden: true,
});

let searchInput: HTMLInputElement;

const handleInputChange = (e: Event) => {
  webviews.callAsync(currentTab()?.id, "findInPage", searchInput.value);
};

const handleInputClick = () => {
  webviews.releaseFocus();
};

const handleInputKeypress = (
  e: KeyboardEvent & {
    currentTarget: HTMLInputElement;
    target: Element;
  }
) => {
  if (e.keyCode === 13) {
    // Return/Enter key
    webviews.callAsync(currentTab()?.id, "findInPage", [
      searchInput.value,
      {
        forward: !e.shiftKey, // find previous if Shift is pressed
        findNext: false,
      },
    ]);
  }
};

const handlePreviousClick = () => {
  webviews.callAsync(currentTab()?.id, "findInPage", [
    searchInput.value,
    {
      forward: false,
      findNext: false,
    },
  ]);
  searchInput.focus();
};

const handleNextClick = () => {
  webviews.callAsync(currentTab()?.id, "findInPage", [
    searchInput.value,
    {
      forward: true,
      findNext: false,
    },
  ]);
  searchInput.focus();
};

export const searchStart = () => {
  setState({ hidden: false, count: "" });
  webviews.releaseFocus();

  searchInput?.focus();
  searchInput?.select();

  if (searchInput.value) {
    webviews.callAsync(currentTab()?.id, "findInPage", searchInput.value);
  }
};

const searchEnd = (options: any = {}) => {
  setState("hidden", true);

  if (currentTab()) {
    webviews.callAsync(
      currentTab()?.id,
      "stopFindInPage",
      options.action || "keepSelection"
    );

    webviews.callAsync(currentTab()?.id, "focus");
  }
};

export const PageSearch = () => {
  onMount(() => {
    defineShortcut("followLink", () => {
      searchEnd({ action: "activateSelection" });
    });

    defineShortcut({ keys: "esc" }, (e) => {
      searchEnd();
    });

    webviews.bindEvent("view-hidden", (tabId) => {
      if (tabId === currentTab()?.id) {
        searchEnd();
      }
    });

    webviews.bindEvent("did-start-navigation", (tabId, url, isInPlace) => {
      if (!isInPlace && tabId === currentTab()?.id) {
        searchEnd();
      }
    });

    webviews.bindEvent("found-in-page", (tabId, data) => {
      if (data.matches) {
        let text = l("findMatchesPlural");

        if (data.matches === 1) {
          text = l("findMatchesSingular");
        }

        setState({
          count: text
            .replace("%i", data.activeMatchOrdinal)
            .replace("%t", data.matches),
        });
      }
    });
  });

  return (
    <div
      id="findinpage-bar"
      hidden={state.hidden}
      class="theme-background-color theme-text-color"
    >
      <input
        class="mousetrap"
        id="findinpage-input"
        placeholder={l("searchInPage")}
        ref={searchInput}
        onClick={handleInputClick}
        onInput={handleInputChange}
        onKeyPress={handleInputKeypress}
      />
      <span id="findinpage-count" class="inline-text">
        {state.count}
      </span>
      <div class="divider" />
      <button id="findinpage-previous-match" onClick={handlePreviousClick}>
        <i class="i carbon:chevron-up navbar-action-button"></i>
      </button>
      <button id="findinpage-next-match" onClick={handleNextClick}>
        <i class="i carbon:chevron-down navbar-action-button"></i>
      </button>
      <div class="divider" />
      <button id="findinpage-end" onClick={() => searchEnd()}>
        <i class="i carbon:close navbar-action-button"></i>
      </button>
    </div>
  );
};
