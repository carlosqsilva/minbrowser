import * as browserUI from "../browserUI";

const addTabButton = document.getElementById(
  "add-tab-button"
) as HTMLButtonElement;

(() => {
  addTabButton?.addEventListener("click", (e) => {
    browserUI.addTab();
  });
})();
