import type { ISettings } from "../settings/settings";

interface SearchEngineObj {
  name: string;
  searchURL: string;
  suggestionsURL?: string;
  custom?: boolean;
}

let currentSearchEngine: SearchEngineObj = {
  name: "",
  searchURL: "%s",
};

export function getCurrentSearchEngine() {
  return currentSearchEngine;
}

export const defaultSearchEngine = "DuckDuckGo";

export const searchEngines = {
  DuckDuckGo: {
    name: "DuckDuckGo",
    searchURL: "https://duckduckgo.com/?q=%s&t=min",
    suggestionsURL: "https://ac.duckduckgo.com/ac/?q=%s&type=list&t=min",
    queryParam: "q",
  },
  Google: {
    name: "Google",
    searchURL: "https://www.google.com/search?q=%s",
    queryParam: "q",
  },
  Bing: {
    name: "Bing",
    searchURL: "https://www.bing.com/search?q=%s",
    suggestionsURL: "https://www.bing.com/osjson.aspx?query=%s",
    queryParam: "q",
  },
  Brave: {
    name: "Brave",
    searchURL: "https://search.brave.com/search?q=%s&source=web",
    suggestionURL: "https://search.brave.com/api/suggest?q=%s&rich=true&source=web",
    queryParam: "q"
  },
  Wikipedia: {
    name: "Wikipedia",
    searchURL: "https://wikipedia.org/w/index.php?search=%s",
    suggestionsURL:
      "https://wikipedia.org/w/api.php?action=opensearch&search=%s",
    queryParam: "search",
  },
  none: {
    name: "none",
    searchURL: "http://%s",
  },
};

for (const e in searchEngines) {
  try {
    searchEngines[e].urlObj = new URL(searchEngines[e].searchURL);
  } catch (e) {}
}

export class SearchEngine {
  static default = "DuckDuckGo"
  public currentSearchEngine: SearchEngineObj = {
    name: "",
    searchURL: "%s",
  }

  constructor(settings: ISettings) {
    settings.listen("searchEngine", (value) => {
      if (value && value.name) {
        this.currentSearchEngine = searchEngines[value.name];
      } else if (value && value.url) {
        let searchDomain!: string;
        try {
          searchDomain = new URL(value.url).hostname.replace("www.", "");
        } catch (e) {}
        this.currentSearchEngine = {
          name: searchDomain || "custom",
          searchURL: value.url,
          custom: true,
        };
      } else {
        this.currentSearchEngine = searchEngines[SearchEngine.default];
      }
    });
  }

  public getCurrent() {
    return this.currentSearchEngine;
  }

  public getSearch(url: string): { engine: string; search: string } | null {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return null;
    }
    for (var e in searchEngines) {
      if (!searchEngines[e].urlObj) {
        continue;
      }
      if (
        searchEngines[e].urlObj.hostname === urlObj.hostname &&
        searchEngines[e].urlObj.pathname === urlObj.pathname
      ) {
        if (urlObj.searchParams.get(searchEngines[e].queryParam)) {
          return {
            engine: searchEngines[e].name,
            search: urlObj.searchParams.get(
              searchEngines[e].queryParam
            ) as string,
          };
        }
      }
    }
    return null;
  }
}
