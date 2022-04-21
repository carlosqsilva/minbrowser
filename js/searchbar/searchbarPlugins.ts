// @ts-check

const searchbar = document.getElementById("searchbar");
import * as searchbarUtils from "./searchbarUtils";

import { empty } from "../util/utils";

interface TopAnswer {
  plugin: string | null;
  item: HTMLDivElement | null;
}

interface Plugin {
  name: string;
  container: HTMLDivElement;
  trigger: (text: string) => boolean;
  showResults: (text: string, input: HTMLInputElement, event: any) => void;
}

const plugins: Plugin[] = []; // format is {name, container, trigger, showResults}
let results = {}; // format is {pluginName: [results]}
let URLOpener;
let URLHandlers = []; // format is {trigger, action}

let topAnswer: TopAnswer = {
  plugin: null,
  item: null,
};

class SearchbarPlugins {
  public topAnswerArea = searchbar?.querySelector(
    ".top-answer-area"
  ) as HTMLDivElement;
  // empties all containers in the searchbar
  public clearAll() {
    empty(this.topAnswerArea!);
    topAnswer = {
      plugin: null,
      item: null,
    };
    for (const plugin of plugins) {
      empty(plugin.container);
    }
  }

  public reset(pluginName: string) {
    empty(this.getContainer(pluginName)!);

    const topAnswerResult = this.getTopAnswer(pluginName);
    if (topAnswerResult) {
      topAnswerResult.remove();
      topAnswer = {
        plugin: null,
        item: null,
      };
    }

    results[pluginName] = [];
  }

  public getTopAnswer(pluginName?: string) {
    if (pluginName) {
      if (topAnswer.plugin === pluginName) {
        return topAnswer.item;
      } else {
        return null;
      }
    } else {
      return this.topAnswerArea.firstChild;
    }
  }

  public setTopAnswer(pluginName: string, data) {
    empty(this.topAnswerArea);

    const item = searchbarUtils.createItem(data);
    item.setAttribute("data-plugin", pluginName);
    item.setAttribute("data-url", data.url);
    this.topAnswerArea.appendChild(item);

    item.addEventListener("click", (e) => {
      URLOpener(data.url, e);
    });

    topAnswer = {
      plugin: pluginName,
      item: item,
    };

    results[pluginName].push(data);
  }

  public addResult(pluginName: string, data, options: any = {}) {
    if (options.allowDuplicates) {
      data.allowDuplicates = true;
    }
    if (data.url && !data.allowDuplicates) {
      // skip duplicates
      for (var plugin in results) {
        for (var i = 0; i < results[plugin].length; i++) {
          if (
            results[plugin][i].url === data.url &&
            !results[plugin][i].allowDuplicates
          ) {
            return;
          }
        }
      }
    }
    const item = searchbarUtils.createItem(data);

    if (data.url) {
      item.setAttribute("data-url", data.url);
      item.addEventListener("click", (e) => {
        URLOpener(data.url, e);
      });

      item.addEventListener("keyup", (e) => {
        /*  right arrow or space should autocomplete with selected item if it's
            a search suggestion */
        if (e.keyCode === 39 || e.keyCode === 32) {
          const input = document.getElementById(
            "tab-editor-input"
          ) as HTMLInputElement;
          input.value = data.url;
          input.focus();
        }
      });
    }

    this.getContainer(pluginName)?.appendChild(item);

    results[pluginName].push(data);
  }

  public addHeading(pluginName: string, data) {
    this.getContainer(pluginName)?.appendChild(
      searchbarUtils.createHeading(data)
    );
  }

  public getContainer(pluginName: string) {
    for (const plugin of plugins) {
      if (plugin.name === pluginName) {
        return plugin.container;
      }
    }
    return null;
  }

  public register(name: string, object: {
    index: number,
    trigger?: (text: string) => boolean,
    showResults?: (text: string, input: HTMLInputElement, event: any ) => void
  }) {
    // add the container
    const container = document.createElement("div");
    container.classList.add("searchbar-plugin-container");
    container.setAttribute("data-plugin", name);
    searchbar?.insertBefore(container, searchbar.childNodes[object.index + 2]);

    plugins.push({
      name: name,
      container: container,
      trigger: object.trigger,
      showResults: object.showResults,
    });

    results[name] = [];
  }

  public run(text: string, input: HTMLInputElement, event) {
    for (const plugin of plugins) {
      try {
        if (
          plugin.showResults &&
          (!plugin.trigger || plugin.trigger(text))
        ) {
          plugin.showResults(text, input, event);
        } else {
          this.reset(plugin.name);
        }
      } catch (e) {
        console.error(
          'error in searchbar plugin "' + plugin.name + '":',
          e
        );
      }
    }
  }

  public registerURLHandler(handler) {
    URLHandlers.push(handler);
  }

  public runURLHandlers(text: string) {
    for (var i = 0; i < URLHandlers.length; i++) {
      if (URLHandlers[i](text)) {
        return true;
      }
    }
    return false;
  }

  public getResultCount(pluginName?: string) {
    if (pluginName) {
      return results[pluginName].length;
    } else {
      var resultCount = 0;
      for (var plugin in results) {
        resultCount += results[plugin].length;
      }
      return resultCount;
    }
  }

  public initialize(opener: any) {
    URLOpener = opener;
  }
}

export default new SearchbarPlugins();
