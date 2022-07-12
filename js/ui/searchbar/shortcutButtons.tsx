import { For } from "solid-js";

import { showHistory } from "../store";

const shortcuts = [
  {
    icon: "recently-viewed",
    text: "!history ",
    action: showHistory
  },
  {
    icon: "star",
    text: "!bookmarks ",
  },
  {
    icon: "overflow-menu-horizontal",
    text: "!",
  },
];

export const ShortcutButtons = () => {
  return (
    <div class="searchbar-plugin-container">
      <For each={shortcuts}>
        {(shortcut) => (
          <button
            tabindex="-1"
            title={shortcut.text}
            class={`searchbar-shortcut i carbon:${shortcut.icon}`}
            onClick={() => shortcut.action()}
          />
        )}
      </For>
    </div>
  );
};
