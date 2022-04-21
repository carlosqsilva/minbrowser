import type { Session } from "electron";
import { app, session } from "electron";
import settings from "../js/util/settings/settingsMain";

/* Use the same user agent as Chrome to improve site compatibility and increase fingerprinting resistance
see https://github.com/minbrowser/min/issues/657 for more information */

// const defaultUserAgent = app.userAgentFallback;
let useCustomUserAgent = settings.get("useCustomUserAgent") ?? false;

if (useCustomUserAgent) {
  app.userAgentFallback = (
    settings.get("customUserAgent") ?? app.userAgentFallback
  )
    .replace(/Min\/\S+\s/, "")
    .replace(/Electron\/\S+\s/, "");
}

function getFirefoxUA() {
  /*
  Guess at an appropriate Firefox version to use in the UA.
  We want a recent version (ideally the latest), but not a version that hasn't been released yet.
  New releases are every ~4 weeks, with some delays for holidays. So assume 4.1 weeks, and estimate
  starting from v91 on 2021-08-10
  */
  const fxVersion =
    91 +
    Math.floor((Date.now() - 1628553600000) / (4.1 * 7 * 24 * 60 * 60 * 1000));
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${fxVersion}.0) Gecko/20100101 Firefox/${fxVersion}.0`;
}

/*
Google blocks signin in some cases unless a custom UA is used
see https://github.com/minbrowser/min/issues/868
*/
export function enableGoogleUASwitcher(session: Session) {
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!useCustomUserAgent && details.url.includes("accounts.google.com")) {
      const url = new URL(details.url);

      if (url.hostname === "accounts.google.com") {
        details.requestHeaders["User-Agent"] = getFirefoxUA();
      }
    }

    const [chromiumVersion] = process.versions.chrome.split(".");
    details.requestHeaders[
      "SEC-CH-UA"
    ] = `"Chromium";v="${chromiumVersion}", " Not A;Brand";v="99"`;
    details.requestHeaders["SEC-CH-UA-MOBILE"] = "?0";

    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
}

app.once("ready", () => {
  enableGoogleUASwitcher(session.defaultSession);
});

app.on("session-created", enableGoogleUASwitcher);
