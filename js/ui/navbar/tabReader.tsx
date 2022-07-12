import webviews from "../webviewUtils";
import { defineShortcut } from "../keybindings";
import { urlParser } from "../shared/urlParser";

import { l } from "../../../localization";
import { currentTab, getTab, updateTab } from "../store";
import { createMemo } from "solid-js";

const readerURL = urlParser.getFileURL(__dirname + "/reader/index.html");
export const isReaderPage = (tabId: string) =>
  getTab(tabId)?.url.indexOf(readerURL) === 0;

export const printArticle = (tabId: string) => {
  if (!isReaderPage(tabId)) {
    throw new Error("attempting to print in a tab that isn't a reader page");
  }

  webviews.callAsync(
    currentTab().id,
    "executeJavaScript",
    "parentProcessActions.printArticle()"
  );
};

const enterReader = (tabId: string, url?: string) => {
  const newURL = `${readerURL}?url=${encodeURIComponent(
    url || getTab(tabId).url
  )}`;
  updateTab(tabId, { url: newURL });
  webviews.update(tabId, newURL);
};

const exitReader = (tabId: string) => {
  const src = urlParser.getSourceURL(getTab(tabId)?.url);
  updateTab(tabId, { url: src });
  webviews.update(tabId, src);
};

const toggleReader = (tabId: string, e?: Event) => {
  e?.stopPropagation();
  isReaderPage(tabId) ? exitReader(tabId) : enterReader(tabId);
};

defineShortcut("toggleReaderView", () => {
  toggleReader(currentTab().id);
});

webviews.bindEvent(
  "did-start-navigation",
  (tabId, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
    if (isInPlace) return;

    if (isMainFrame) {
      // assume the new page can't be readered, we'll get another message if it can
      updateTab(tabId, { readerable: false });
    }
  }
);

webviews.bindIPC("canReader", (tab) => {
  updateTab(tab, {
    readerable: true,
  });
});

interface TabReaderProps {
  tabId: string;
  readerable: boolean;
}

export const TabReader = (props: TabReaderProps) => {
  const isReader = createMemo(() => isReaderPage(props.tabId));

  return (
    <button
      role="button"
      title={isReader() ? l("exitReaderView") : l("enterReaderView")}
      onClick={[toggleReader, props.tabId]}
      class="reader-button tab-icon i carbon:notebook"
      classList={{
        "is-reader": isReader(),
        "can-reader": !isReader() && props.readerable,
      }}
    />
  );
};
