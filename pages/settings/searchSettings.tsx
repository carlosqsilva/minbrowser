import { For, createSignal } from "solid-js";
import {
  SearchEngine,
  searchEngine,
  searchEngines,
} from "../../js/util/searchEngine/view";
import settings from "../../js/util/settings/settingsContent";
import { l } from "../../localization/view";

const [engine, setEngine] = createSignal(SearchEngine.default);

const handleEngineChange = (e) => {
  setEngine(e.target.value);
  settings.set("searchEngine", { name: e.target.value });
};

settings.onLoad(() => {
  setEngine(searchEngine?.currentSearchEngine?.name ?? SearchEngine.default)
});

export const SearchSettings = () => {
  return (
    <div class="settings-container" id="search-engine-settings-container">
      <h3>{l("settingsSearchEngineHeading")}</h3>

      <div class="setting-section">
        <label for="defaultSearchEngine">
          {l("settingsDefaultSearchEngine")}
        </label>

        <select
          id="default-search-engine"
          name="defaultSearchEngine"
          onChange={handleEngineChange}
        >
          <For each={Object.keys(searchEngines)}>
            {(engineKey) => (
              <option value={engineKey} selected={engine() === engineKey}>
                {searchEngines[engineKey].name}
              </option>
            )}
          </For>
        </select>

        <div class="settings-info-subheading" style="padding-top: 0.4em">
          {l("settingsDDGExplanation")}
        </div>
      </div>
    </div>
  );
};
