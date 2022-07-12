// @ts-check

// defines schema for the browsingData database
// requires Dexie.min.js
import Dexie, { Table } from "dexie";
import { ipcRenderer as ipc } from "electron";

import { l } from "../../../localization";

const dbErrorMessage =
  "Internal error opening backing store for indexedDB.open";
let dbErrorAlertShown = false;

export interface Place {
  id?: number;
  url: string;
  title: string;
  color: string | null; // the main color of the page, extracted from the page icon
  visitCount: number;
  lastVisit: number;
  pageHTML: string; // a saved copy of the page's HTML, when it was last visited. Removed in 1.6.0, so all pages visited after then will have an empty string in this field.
  extractedText: string; // the text content of the page, extracted from pageHTML.
  searchIndex: string[]; // an array of words on the page (created from extractedText), used for full-text searchIndex
  isBookmarked: boolean; // whether the page is a bookmark
  tags: string[];
  metadata: Record<string, any>;
  hScore?: number
  boost?: number
}

export class DB extends Dexie {
  public places!: Table<Place, number>;
  constructor() {
    super("browsingData2");
    this.version(1).stores({
      places:
        "++id, &url, title, color, visitCount, lastVisit, pageHTML, extractedText, *searchIndex, isBookmarked, *tags, metadata",
    });
  }
}

export const db = new DB();

db.open()
  .then(() => {
    console.log("database opened ", performance.now());
  })
  .catch((error) => {
    if (error.message.indexOf(dbErrorMessage) !== -1 && !dbErrorAlertShown) {
      window &&
        window.alert &&
        window.alert(l("multipleInstancesErrorMessage"));
      ipc.send("quit");

      dbErrorAlertShown = true;
    }
  });