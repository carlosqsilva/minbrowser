import EventEmitter from "node:events";
import { createStore } from "solid-js/store";
import { currentTab } from "./tabs";
import { urlParser } from "../shared/urlParser";

interface StateUI {
  inputValue: string;
  historyHidden: boolean;
  editorHidden: boolean;
  placeholderHidden: boolean;
}

export const editorEvent = new EventEmitter();

export const [stateUI, setStateUI] = createStore<StateUI>({
  inputValue: "",
  historyHidden: true,
  editorHidden: false,
  placeholderHidden: true,
});

export const setEditorHidden = () => {
  setStateUI({ editorHidden: true, historyHidden: true });
  console.log("hidden");
  process.nextTick(() => {
    editorEvent.emit("editor-hidden");
  });
};

export const setEditorVisible = () => {
  setStateUI("editorHidden", false);
  process.nextTick(() => {
    let currentURL = urlParser.getSourceURL(currentTab().url);
    if (currentURL === "min://newtab") {
      currentURL = "";
    }
    editorEvent.emit("editor-visible", { value: currentURL });
  });
};

export const showPlaceHolder = () => {
  setStateUI("placeholderHidden", false);
};

export const hidePlaceHolder = () => {
  setStateUI("placeholderHidden", true);
};

export const setInputValue = (value: string) => {
  setStateUI({ inputValue: value });
};

export const showHistory = () => {
  setStateUI({
    inputValue: "",
    historyHidden: false,
    editorHidden: false,
  });

  process.nextTick(() => {
    editorEvent.emit("editor-visible", {
      value: "",
    });
  });
};
