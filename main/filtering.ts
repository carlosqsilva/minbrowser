// @ts-check

import fs from "fs";
import path from "path";
import { app, Response, Session, session, webContents } from "electron";
import type { OnBeforeRequestListenerDetails } from "electron";
// import settings from "../js/util/settings/settingsMain";
import { localStorage } from "./localStorage";

interface FilteringSettings {
  blockingLevel: 0 | 1 | 2;
  exceptionDomains: string[];
  contentTypes: string[];
}

const defaultFilteringSettings: FilteringSettings = {
  blockingLevel: 1,
  exceptionDomains: [],
  contentTypes: [],
};

const enabledFilteringOptions: FilteringSettings = {
  blockingLevel: 0,
  exceptionDomains: [],
  contentTypes: [], // script, image
};

const globalParamsToRemove = [
  // microsoft
  "msclkid",
  // google
  "gclid",
  "dclid",
  // facebook
  "fbclid",
  // yandex
  "yclid",
  "_openstat",
  // adobe
  "icid",
  // instagram
  "igshid",
  // mailchimp
  "mc_eid",
];

const siteParamsToRemove = {
  "www.amazon.com": [
    "_ref",
    "ref_",
    "pd_rd_r",
    "pd_rd_w",
    "pf_rd_i",
    "pf_rd_m",
    "pf_rd_p",
    "pf_rd_r",
    "pf_rd_s",
    "pf_rd_t",
    "pd_rd_wg",
  ],
  "www.ebay.com": ["_trkparms"],
};

// for tracking the number of blocked requests
let unsavedBlockedRequests = 0;

setInterval(() => {
  if (unsavedBlockedRequests > 0) {
    const currentCount = localStorage.getItem("filteringBlockedCount", 0);
    localStorage.setItem(
      "filteringBlockedCount",
      currentCount + unsavedBlockedRequests
    );
    unsavedBlockedRequests = 0;
  }
}, 60000);

// electron uses different names for resource types than ABP
// electron: https://github.com/electron/electron/blob/34c4c8d5088fa183f56baea28809de6f2a427e02/shell/browser/net/atom_network_delegate.cc#L30
// abp: https://adblockplus.org/filter-cheatsheet#filter-options
const electronABPElementTypeMap = {
  mainFrame: "document",
  subFrame: "subdocument",
  stylesheet: "stylesheet",
  script: "script",
  image: "image",
  object: "object",
  xhr: "xmlhttprequest",
  other: "other", // ?
};

const parser = require("../ext/abp-filter-parser-modified/abp-filter-parser.js");
let parsedFilterData = {};

function initFilterList() {
  // discard old data if the list is being re-initialized
  parsedFilterData = {};

  fs.readFile(
    path.join(
      __dirname,
      "/ext/filterLists/easylist+easyprivacy-noelementhiding.txt"
    ),
    "utf8",
    (err, data) => {
      if (err) return;
      parser.parse(data, parsedFilterData);
    }
  );

  fs.readFile(
    path.join(app.getPath("userData"), "customFilters.txt"),
    "utf8",
    (err, data) => {
      if (!err && data) {
        parser.parse(data, parsedFilterData);
      }
    }
  );
}

function removeWWW(domain: string) {
  return domain.replace(/^www\./i, "");
}

function requestIsThirdParty(baseDomain, requestURL) {
  baseDomain = removeWWW(baseDomain);
  var requestDomain = removeWWW(parser.getUrlHost(requestURL));

  return !(
    parser.isSameOriginHost(baseDomain, requestDomain) ||
    parser.isSameOriginHost(requestDomain, baseDomain)
  );
}

function requestDomainIsException(domain) {
  return enabledFilteringOptions.exceptionDomains.includes(removeWWW(domain));
}

export function filterPopups(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return true;
  }

  const domain = parser.getUrlHost(url);
  if (
    enabledFilteringOptions.blockingLevel > 0 &&
    !requestDomainIsException(domain)
  ) {
    if (
      enabledFilteringOptions.blockingLevel === 2 ||
      (enabledFilteringOptions.blockingLevel === 1 &&
        requestIsThirdParty(domain, url))
    ) {
      if (
        parser.matches(parsedFilterData, url, {
          domain: domain,
          elementType: "popup",
        })
      ) {
        unsavedBlockedRequests++;
        return false;
      }
    }
  }

  return true;
}

function removeTrackingParams(url) {
  try {
    var urlObj = new URL(url);
    for (const param of urlObj.searchParams) {
      if (
        globalParamsToRemove.includes(param[0]) ||
        (siteParamsToRemove[urlObj.hostname] &&
          siteParamsToRemove[urlObj.hostname].includes(param[0]))
      ) {
        urlObj.searchParams.delete(param[0]);
      }
    }
    return urlObj.toString();
  } catch (e) {
    console.warn(e);
    return url;
  }
}

function handleRequest(
  details: OnBeforeRequestListenerDetails,
  callback: (resp: Response) => void
) {
  /* eslint-disable standard/no-callback-literal */

  // webContentsId may not exist if this request is a mainFrame or subframe
  let domain;
  if (details.webContentsId) {
    domain = parser.getUrlHost(
      webContents.fromId(details.webContentsId).getURL()
    );
  }

  const isExceptionDomain = domain && requestDomainIsException(domain);

  const modifiedURL =
    enabledFilteringOptions.blockingLevel > 0 && !isExceptionDomain
      ? removeTrackingParams(details.url)
      : details.url;

  if (
    !(
      details.url.startsWith("http://") || details.url.startsWith("https://")
    ) ||
    details.resourceType === "mainFrame"
  ) {
    callback({
      cancel: false,
      // requestHeaders: details.requestHeaders,
      redirectURL: modifiedURL !== details.url ? modifiedURL : undefined,
    });
    return;
  }

  // block javascript and images if needed
  if (enabledFilteringOptions.contentTypes.length > 0) {
    for (let content of enabledFilteringOptions.contentTypes) {
      if (details.resourceType === content) {
        callback({ cancel: true });
        return;
      }
    }
  }

  if (enabledFilteringOptions.blockingLevel > 0 && !isExceptionDomain) {
    if (
      (enabledFilteringOptions.blockingLevel === 1 &&
        (!domain || requestIsThirdParty(domain, details.url))) ||
      enabledFilteringOptions.blockingLevel === 2
    ) {
      // by doing this check second, we can skip checking same-origin requests if only third-party blocking is enabled
      const matchesFilters = parser.matches(parsedFilterData, details.url, {
        domain: domain,
        elementType: electronABPElementTypeMap[details.resourceType],
      });
      if (matchesFilters) {
        unsavedBlockedRequests++;

        callback({
          cancel: true,
          // requestHeaders: details.requestHeaders
        });
        return;
      }
    }
  }

  callback({
    cancel: false,
    // requestHeaders: details.requestHeaders,
    redirectURL: modifiedURL !== details.url ? modifiedURL : undefined,
  });
  /* eslint-enable standard/no-callback-literal */
}

function setFilteringSettings(settings) {
  if (!settings) {
    settings = {};
  }

  for (var key in defaultFilteringSettings) {
    if (settings[key] === undefined) {
      settings[key] = defaultFilteringSettings[key];
    }
  }

  if (
    settings.blockingLevel > 0 &&
    !(enabledFilteringOptions.blockingLevel > 0)
  ) {
    // we're enabling tracker filtering
    initFilterList();
  }

  enabledFilteringOptions.contentTypes = settings.contentTypes;
  enabledFilteringOptions.blockingLevel = settings.blockingLevel;
  enabledFilteringOptions.exceptionDomains = settings.exceptionDomains.map(
    (d) => removeWWW(d)
  );
}

function registerFiltering(ses: Session) {
  ses.webRequest.onBeforeRequest(handleRequest);
}

app.once("ready", () => {
  registerFiltering(session.defaultSession);
});

app.on("session-created", registerFiltering);

localStorage.onReady((storage) => {
  storage.listen("filtering", (value) => {
    setFilteringSettings(value);
  });
});
