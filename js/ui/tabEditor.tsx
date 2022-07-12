import { onMount } from "solid-js";
import { stateUI, setInputValue, editorEvent } from "./store";
import * as searchbar from "./searchbar";
import webviews from "./webviewUtils";
import keyboardNavigation from "./shared/keyboardNavigationHelper";

import { l } from "../../localization/view";

function handleKeyUp(e: KeyboardEvent) {
  if (e.keyCode === 8) {
    searchbar.showResults(e);
  }
}

export let tabEditorInput: HTMLInputElement;

function handleKeypress(e: KeyboardEvent) {
  if (e.keyCode === 13) {
    // Enter key pressed
    const attr = tabEditorInput.getAttribute("data-autocomplete");
    if (attr && attr?.toLowerCase() === tabEditorInput.value.toLowerCase()) {
      // TODO open url that was autocompleted
      searchbar.searchBarOpenURL(tabEditorInput.getAttribute("data-autocomplete"), e);
    } else {
      searchbar.searchBarOpenURL(tabEditorInput.value, e);
    }
  } else if (
    e.keyCode === 9 || // Tab key, do nothing
    e.keyCode === 8 || // Delete key is handled in keyup event
    e.keyCode === 16 // Shift key
  ) {
    return;
  } else {
    searchbar.showResults(e);
  }

  const keyPressed = e.key;
  const keyPressedIndex = tabEditorInput.value
    .substring(tabEditorInput.selectionStart, tabEditorInput.selectionEnd)
    .indexOf(keyPressed);

  if (keyPressed && keyPressedIndex === 0) {
    tabEditorInput.selectionStart += 1;
    e.preventDefault();
  }
}

export const TabEditor = () => {
  let tabEditorContainer: HTMLDivElement;

  onMount(() => {
    keyboardNavigation.addToGroup("searchbar", tabEditorContainer);
  });

  return (
    <div id="tab-editor" ref={tabEditorContainer} hidden={stateUI.editorHidden}>
      <input
        ref={tabEditorInput}
        id="tab-editor-input"
        class="mousetrap"
        placeholder={l("searchbarPlaceholder")}
        value={stateUI.inputValue}
        spellcheck={false}
        onKeyUp={handleKeyUp}
        onKeyPress={handleKeypress}
        // @ts-ignore
        onInput={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
};

editorEvent.on("editor-visible", ({ value }) => {
  webviews.requestPlaceholder("editMode");
  document.body.classList.add("is-edit-mode");
  tabEditorInput.value = value;
  tabEditorInput.focus();
  if (value) {
    tabEditorInput.select();
  }
  tabEditorInput.scrollLeft = 0;
  searchbar.runPlugins(value, null)
});

editorEvent.on("editor-hidden", () => {
  tabEditorInput.blur();
  document.body.classList.remove("is-edit-mode");
  webviews.hidePlaceholder("editMode");
});
