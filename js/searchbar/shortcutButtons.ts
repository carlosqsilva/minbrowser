import { searchbar } from "./searchbar";
import searchbarPlugins from "./searchbarPlugins";

const shortcuts = [
  {
    icon: "recently-viewed",
    text: "!history ",
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

function showShortcutButtons(text, input, event) {
  const container = searchbarPlugins.getContainer("shortcutButtons");

  searchbarPlugins.reset("shortcutButtons");

  shortcuts.forEach((shortcut) => {
    const el = document.createElement("button");
    el.className = "searchbar-shortcut i carbon:" + shortcut.icon;
    el.title = shortcut.text;
    el.tabIndex = -1;
    el.addEventListener("click", () => {
      input.value = shortcut.text;
      input.focus();
      searchbar.showResults(shortcut.text);
    });

    container?.appendChild(el);
  });
}

(function initialize() {
  searchbarPlugins.register("shortcutButtons", {
    index: 10,
    showResults: showShortcutButtons,
    trigger: (text) => !text,
  });
})();
