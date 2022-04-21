import { ipcRenderer as ipc } from "electron";

/* detects if a page is readerable, and tells the main process if it is */

function checkReaderStatus() {
  if (pageIsReaderable()) {
    ipc.send("canReader");
  }
}

function pageIsReaderable() {
  const paragraphMap = new Map();

  const paragraphs = Array.from(document.querySelectorAll("p"));
  let totalLength = 0;

  if (!paragraphs) {
    return false;
  }

  for (const paragraph of paragraphs) {
    const pLength = Math.max(
      paragraph.textContent.replace(/\s+/g, " ").length - 100,
      -30
    );
    totalLength += pLength;

    const prev = paragraphMap.get(paragraph.parentNode) || 0;
    paragraphMap.set(paragraph.parentNode, prev + pLength);
  }

  let largestValue = 0;

  paragraphMap.forEach((value, key) => {
    if (value > largestValue) {
      largestValue = value;
    }
  });

  if (
    (largestValue > 600 && largestValue / totalLength > 0.33) ||
    (largestValue > 400 &&
      document.querySelector(
        'article, meta[property="og:type"][content="article"]'
      ))
  ) {
    return true;
  } else {
    return false;
  }
}

if (process.isMainFrame) {
  // unlike DOMContentLoaded, readystatechange doesn't wait for <script defer>, so it happens a bit sooner
  document.addEventListener("readystatechange", () => {
    if (document.readyState === "interactive") {
      checkReaderStatus();
    }
  });
  window.addEventListener("load", checkReaderStatus);
}
