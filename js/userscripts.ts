/* implements userscript support */

import fs from "fs";
import path from "path";

import webviews from "./webviews";
import settings from "./util/settings/settings";
import tabEditor from "./navbar/tabEditor";
import searchbarPlugins from "./searchbar/searchbarPlugins";
import { registerCustomBang } from "./searchbar/bangsPlugin";
const urlParser = require("./util/urlParser.js");

import { tasks } from "./tabState";
import { l } from "../localization";
import { getConfig } from "./util/utils";

interface Features {
  name?: string;
}

export function parseTampermonkeyFeatures(content) {
  const parsedFeatures: Features = {};
  let foundFeatures = false;

  let lines = content.split("\n");

  let isInFeatures = false;
  for (const line of lines) {
    if (line.trim() === "// ==UserScript==") {
      isInFeatures = true;
      continue;
    }
    if (line.trim() === "// ==/UserScript==") {
      isInFeatures = false;
      break;
    }
    if (isInFeatures && line.startsWith("//")) {
      foundFeatures = true;
      let feature = line.replace("//", "").trim();
      let featureName = feature.split(" ")[0];
      let featureValue = feature.replace(featureName + " ", "").trim();
      featureName = featureName.replace("@", "");

      // special case: find the localized name for the current locale
      if (
        featureName.startsWith("name:") &&
        featureName.split(":")[1].substring(0, 2) ===
          navigator.language.substring(0, 2)
      ) {
        featureName = "name:local";
      }
      if (parsedFeatures[featureName]) {
        parsedFeatures[featureName].push(featureValue);
      } else {
        parsedFeatures[featureName] = [featureValue];
      }
    }
  }

  if (foundFeatures) {
    return parsedFeatures;
  } else {
    return null;
  }
}

// checks if a URL matches a wildcard pattern
export function urlMatchesPattern(url, pattern) {
  let idx = -1;
  let parts = pattern.split("*");

  for (const part of parts) {
    idx = url.indexOf(part, idx);
    if (idx === -1) {
      return false;
    }
    idx += part.length;
  }
  return idx !== -1;
}

interface Script {
  content: string;
  name: string;
  options: {
    match?: string[];
    name?: string;
    include?: string[];
    exclude?: string[];
    "run-at"?: string[];
  };
}

class Userscripts {
  public scripts: Script[] = []; // {options: {}, content}
  public loadScripts() {
    this.scripts = [];

    const scriptDir = path.join(getConfig("user-data-path"), "userscripts");

    fs.readdir(scriptDir, (err, files) => {
      if (err || files.length === 0) {
        return;
      }

      // store the scripts in memory
      files.forEach((filename) => {
        if (filename.endsWith(".js")) {
          fs.readFile(path.join(scriptDir, filename), "utf-8", (err, file) => {
            if (err || !file) {
              return;
            }

            var domain = filename.slice(0, -3);
            if (domain.startsWith("www.")) {
              domain = domain.slice(4);
            }
            if (!domain) {
              return;
            }

            const tampermonkeyFeatures = parseTampermonkeyFeatures(file);
            if (tampermonkeyFeatures) {
              let scriptName =
                tampermonkeyFeatures["name:local"] || tampermonkeyFeatures.name;
              if (scriptName) {
                scriptName = scriptName[0];
              } else {
                scriptName = filename;
              }
              this.scripts.push({
                options: tampermonkeyFeatures,
                content: file,
                name: scriptName,
              });
            } else {
              // legacy script
              if (domain === "global") {
                this.scripts.push({
                  options: {
                    match: ["*"],
                  },
                  content: file,
                  name: filename,
                });
              } else {
                this.scripts.push({
                  options: {
                    match: ["*://" + domain],
                  },
                  content: file,
                  name: filename,
                });
              }
            }
          });
        }
      });
    });
  }

  public getMatchingScripts(src: string) {
    return this.scripts.filter((script) => {
      if (
        (!script.options.match && !script.options.include) ||
        (script.options.match &&
          script.options.match.some((pattern) =>
            urlMatchesPattern(src, pattern)
          )) ||
        (script.options.include &&
          script.options.include.some((pattern) =>
            urlMatchesPattern(src, pattern)
          ))
      ) {
        if (
          !script.options.exclude ||
          !script.options.exclude.some((pattern) =>
            urlMatchesPattern(src, pattern)
          )
        ) {
          return true;
        }
      }
    });
  }

  public runScript(tabId: string, script: Script) {
    if (urlParser.isInternalURL(tasks.tabs.get(tabId).url)) {
      return;
    }
    webviews.callAsync(tabId, "executeJavaScript", [
      script.content,
      false,
      null,
    ]);
  }

  public onPageLoad(tabId: string) {
    if (this.scripts.length === 0) {
      return;
    }

    const src = tasks.tabs.get(tabId).url;

    this.getMatchingScripts(src).forEach((script) => {
      // TODO run different types of scripts at the correct time
      if (
        !script.options["run-at"] ||
        script.options["run-at"].some((i) =>
          [
            "document-start",
            "document-body",
            "document-end",
            "document-idle",
          ].includes(i)
        )
      ) {
        this.runScript(tabId, script);
      }
    });
  }
  constructor() {
    // statistics.registerGetter("userscriptCount", function () {
    //   return userscripts.scripts.length;
    // });

    settings.listen("userscriptsEnabled", (value) => {
      if (value === true) {
        this.loadScripts();
      } else {
        this.scripts = [];
      }
    });
    webviews.bindEvent("dom-ready", (tabId: string) => this.onPageLoad(tabId));

    registerCustomBang({
      phrase: "!run",
      snippet: l("runUserscript"),
      isAction: false,
      showSuggestions: (text, input, event) => {
        searchbarPlugins.reset("bangs");

        let isFirst = true;
        this.scripts.forEach((script) => {
          if (script.name.toLowerCase().startsWith(text.toLowerCase())) {
            searchbarPlugins.addResult("bangs", {
              title: script.name,
              fakeFocus: isFirst && text,
              click: () => {
                tabEditor.hide();
                this.runScript(tasks.tabs.getSelected()!, script);
              },
            });
            isFirst = false;
          }
        });
      },
      fn: (text: string) => {
        if (!text) {
          return;
        }
        var matchingScript = this.scripts.find((script) =>
          script.name.toLowerCase().startsWith(text.toLowerCase())
        );
        if (matchingScript) {
          this.runScript(tasks.tabs.getSelected()!, matchingScript);
        }
      },
    });
  }
}

const userScript = new Userscripts();

export default userScript;
