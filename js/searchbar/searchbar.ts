// @ts-check

import EventEmitter from "events";

import webviews from "../webviews";
// import * as  keybindings from '../keybindings'
// var urlParser = require("../util/urlParser.js");
import searchbarPlugins from "./searchbarPlugins";
import keyboardNavigationHelper from "../util/keyboardNavigationHelper"

class Searchbar {
  public el = document.getElementById("searchbar") as HTMLDivElement;
  public associatedInput: HTMLInputElement | null = null;
  public events = new EventEmitter();
  public show(associatedInput: HTMLInputElement) {
    this.el.hidden = false;
    this.associatedInput = associatedInput;
  }

  public hide() {
    this.associatedInput = null;
    this.el.hidden = true;

    searchbarPlugins.clearAll();
  }

  public getValue() {
    const text = this.associatedInput?.value;
    return text?.replace(
      text.substring(
        this.associatedInput?.selectionStart!,
        this.associatedInput?.selectionEnd!
      ),
      ""
    );
  }

  public showResults(text: string, event?: any) {
    // find the real input value, accounting for highlighted suggestions and the key that was just pressed
    // delete key doesn't behave like the others, String.fromCharCode returns an unprintable character (which has a length of one)

    let realText: string;
    if (event && event.keyCode !== 8) {
      realText =
        text.substring(0, this.associatedInput?.selectionStart!) +
        event.key +
        text.substring(this.associatedInput?.selectionEnd!, text.length);
    } else {
      realText = text;
    }

    searchbarPlugins.run(realText, this.associatedInput!, event);
  }

  public openURL(url: string, event?: any) {
    const hasURLHandler = searchbarPlugins.runURLHandlers(url);

    if (hasURLHandler) {
      return;
    }

    if (event && event.metaKey) {
      openURLInBackground(url);
      return true;
    } else {
      this.events.emit("url-selected", { url: url, background: false });
      // focus the webview, so that autofocus inputs on the page work
      webviews.focus();
      return false;
    }
  }
}

export const searchbar = new Searchbar();

export function openURLInBackground(url: string) {
  // used to open a url in the background, without leaving the searchbar
  searchbar.events.emit("url-selected", { url: url, background: true });

  const item = searchbar.el.querySelector(
    ".searchbar-item:focus"
  ) as HTMLDivElement;
  if (item) {
    // remove the highlight from an awesomebar result item, if there is one
    item.blur();
  }
}

keyboardNavigationHelper.addToGroup("searchbar", searchbar.el);
searchbarPlugins.initialize((url: string, event: any) =>
  searchbar.openURL(url, event)
);