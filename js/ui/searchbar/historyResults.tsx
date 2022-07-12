import { createEffect, For, onCleanup } from "solid-js";
import { ipcRenderer as ipc } from "electron";

import { Result, ResultItem } from "./searchResult";
import { places } from "../places/places";
import { formatRelativeDate } from "../shared/relativeDate";
import { urlParser } from "../shared/urlParser";
import { l } from "../../../localization";
import { createStore, produce } from "solid-js/store";
import { stateUI } from "../store";
import { searchBarOpenURL } from "./searchbar";

const MAX_RESULTS = 200;
const [results, setResults] = createStore<Result[]>([]);

const getPlacesResults = (text: string) => {
  places.searchPlaces(
    text,
    (results) => {
      let lastRelativeDate = ""; // used to generate headings

      const resultItems: Result[] = [];

      for (let i = 0; i < MAX_RESULTS; i++) {
        if (!results[i]) break;

        const thisRelativeDate = formatRelativeDate(results[i].lastVisit);

        if (thisRelativeDate !== lastRelativeDate) {
          lastRelativeDate = thisRelativeDate;

          resultItems.push({
            title: thisRelativeDate,
            header: true,
          });
        }

        resultItems.push({
          title: results[i].title,
          secondaryText: urlParser.getSourceURL(results[i].url),
          fakeFocus: i === 0 && !!text,
          icon: results[i].isBookmarked ? "carbon:star" : "",
          url: results[i].url,
          showDeleteButton: true,
        });
      }

      setResults(resultItems);
    },
    { limit: Infinity, sortByLastVisit: true }
  );
};

const handleDelete = (url: string, e: Event) => {
  places.deleteHistory(url);
  setResults(
    produce<Result[]>((draft) => {
      for (let i = 0; i < draft.length; i++) {
        if (draft[i].url === url) {
          draft.splice(i, 1);
          break;
        }
      }
    })
  );
};

const clearHistory = () => {
  if (confirm(l("clearHistoryConfirmation"))) {
    places.deleteAllHistory();
    ipc.invoke("clearStorageData");
  }
};

export const HistoryResults = () => {
  createEffect(() => {
    if (!stateUI.historyHidden) getPlacesResults(stateUI.inputValue);
  });

  // cleaning history results
  onCleanup(() => setResults([]));

  return (
    <div class="searchbar-plugin-container">
      <button class="searchbar-floating-button" onClick={clearHistory}>
        {l("clearHistory")}
      </button>
      <For each={results}>
        {(data) => (
          <ResultItem
            data={data}
            onSelectResult={searchBarOpenURL}
            onDeleteResult={handleDelete}
          />
        )}
      </For>
    </div>
  );
};
