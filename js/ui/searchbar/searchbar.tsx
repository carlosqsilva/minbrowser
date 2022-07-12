import EventEmitter from "node:events";
import { For, onMount, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { stateUI } from "../store";
import keyboardNavigation from "../shared/keyboardNavigationHelper";

import { ShortcutButtons } from "./shortcutButtons";
import { ResultItem, Result } from "./searchResult";
import { HistoryResults } from "./historyResults";

export const searchBarEvent = new EventEmitter();

interface State {
  plugins: Record<string, Result[]>;
  topAnswer: {
    plugin: string | null;
    result: Result | null;
  };
}

export interface Plugin {
  name: string;
  trigger: (text: string) => boolean;
  showResults: (text: string, input: HTMLInputElement, event: any) => void;
}

let plugins: Plugin[] = [];

const [state, setState] = createStore<State>({
  plugins: {},
  topAnswer: {
    plugin: null,
    result: null,
  },
});

export const registerSearchbarPlugins = (...inputPlugins: Plugin[]) => {
  plugins = inputPlugins;
  setState(
    produce<State>((draft) => {
      for (const plugin of inputPlugins) {
        draft.plugins[plugin.name] = [];
      }
    })
  );

  requestIdleCallback(() => runPlugins("", null));
};

export const resetPlugin = (name: string) => {
  setState("plugins", name, []);
};

export const resetAllPlugin = () => {
  plugins.forEach((p) => resetPlugin(p.name));
};

export const getResultCount = (plugin?: string) => {
  if (plugin) {
    return state.plugins[plugin].length;
  }

  let count = 0;
  for (let plugin in state.plugins) {
    count += state.plugins[plugin].length;
  }
  return count;
};

export const getTopAnswer = (plugin?: string) => {
  if (plugin) {
    return state.topAnswer.plugin === plugin ? state.topAnswer.result : null;
  }

  return state.topAnswer.result;
};

export const setTopAnswer = (plugin: string, result: Result | null) => {
  setState("topAnswer", { plugin, result });
};

export const addResult = (
  name: string,
  result: Result,
  allowDuplicate = false
) => {
  if (!allowDuplicate) {
    for (let pluginName in state.plugins) {
      for (let resultData of state.plugins[pluginName]) {
        if (resultData.url === result.url) return;
      }
    }
  }

  setState("plugins", name, (r) => [...r, result]);
};

export const runPlugins = (text: string, input?: HTMLInputElement | null) => {
  for (let i = 0; i < plugins.length; i++) {
    try {
      if (
        plugins[i].showResults &&
        (!plugins[i].trigger || plugins[i].trigger(text))
      ) {
        plugins[i].showResults(text, input, event);
      } else {
        resetPlugin(plugins[i].name);
      }
    } catch (e) {
      console.log(`Searchbar [${plugins[i].name}] for text: ${text}`, e);
    }
  }
};

export const showResults = (event: KeyboardEvent) => {
  if (stateUI.editorHidden || !stateUI.historyHidden) return;

  const input = event.currentTarget as HTMLInputElement;
  let text: string;
  if (event && event.keyCode !== 8) {
    text =
      input.value.substring(0, input.selectionStart!) +
      event.key +
      input.value.substring(input.selectionEnd!, input.value.length);
  } else {
    text = input.value;
  }

  runPlugins(text, input);
};

export const openURLInBackground = (url: string) => {
  searchBarEvent.emit("url-selected", {
    url,
    background: true,
  });

  searchBarRef
    .querySelector(".searchbar-item:focus")
    // @ts-ignore
    ?.blur();
};

export const searchBarOpenURL = (
  url: string,
  event?: KeyboardEvent | MouseEvent
) => {
  const finalUrl = url ?? (event.target as HTMLInputElement).value;

  if (event && event.metaKey) {
    openURLInBackground(finalUrl);
    return true;
  }

  searchBarEvent.emit("url-selected", {
    url: finalUrl,
  });

  return false;
};

let searchBarRef: HTMLDivElement;
let pluginTopAnswerContainer: HTMLDivElement;

export const SearchBar = () => {
  onMount(() => {
    keyboardNavigation.addToGroup("searchbar", searchBarRef);
  });

  return (
    <div
      id="searchbar"
      ref={searchBarRef}
      class="theme-background-color theme-text-color"
      hidden={stateUI.editorHidden}
    >
      <div class="top-answer-area" ref={pluginTopAnswerContainer}>
        <Show when={state.topAnswer.result}>
          <ResultItem
            data={state.topAnswer.result}
            onSelectResult={searchBarOpenURL}
          />
        </Show>
      </div>

      <Show when={stateUI.historyHidden}>
        <For each={plugins}>
          {(plugin) => (
            <div
              id={plugin.name}
              class="searchbar-plugin-container"
              data-plugin={plugin.name}
            >
              <For each={state.plugins[plugin.name]}>
                {(result) => (
                  <ResultItem data={result} onSelectResult={searchBarOpenURL} />
                )}
              </For>
            </div>
          )}
        </For>
      </Show>

      <Show when={!stateUI.historyHidden}>
        <HistoryResults />
      </Show>

      <Show when={stateUI.historyHidden}>
        <ShortcutButtons />
      </Show>
    </div>
  );
};
