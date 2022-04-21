import { For } from "solid-js";
import { createStore } from "solid-js/store";

import { l } from "../../localization/view";
import { userKeyMap, KeyMapObj } from "../../js/util/keyMap";
import settings from "../../js/util/settings/settingsContent";
import { showRestartRequiredBanner } from "./bannerSettings";

const [keyMap, setKeyMap] = createStore<Partial<KeyMapObj>>({});

settings.get("keyMap", (keyMapSettings) => {
  setKeyMap(userKeyMap(keyMapSettings));
});

const formatCamelCase = (text: string) => {
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const modRegex = /\bmod\b/g;
const formatKeyValue = (value: string | string[]) => {
  // multiple shortcuts should be separated by commas
  if (Array.isArray(value)) {
    value = value.join(", ");
  }

  return value.replace(modRegex, "command");
};

const cmdRegex = /\b(command)|(cmd)\b/g;
const parseKeyInput = (input: string) => {
  // input may be a single mapping or multiple mappings comma separated.
  const keymapValues = input.toLowerCase().split(",");

  const finalKeymap = [];
  for (const keymap of keymapValues) {
    const value = keymap.trim().replace(cmdRegex, "mod");
    if (Boolean(value)) {
      finalKeymap.push(value);
    }
  }

  return finalKeymap.length > 1 ? finalKeymap : finalKeymap[0];
};

const handleKeyMapChange = (name: keyof KeyMapObj, e) => {
  settings.get("keyMap", (keyMapSettings) => {
    if (!keyMapSettings) {
      keyMapSettings = {};
    }

    const keyValue = parseKeyInput(e.target.value);
    keyMapSettings[name] = keyValue;

    setKeyMap(name, keyValue);
    settings.set("keyMap", keyMapSettings);
    showRestartRequiredBanner()
  });
};

export const ShortcutSettings = () => {
  return (
    <div class="settings-container" id="keymap-settings-container">
      <h3>{l("settingsKeyboardShortcutsHeading")}</h3>

      <div class="settings-info-subheading">
        {l("settingsKeyboardShortcutsHelp")}
      </div>

      <div class="setting-section">
        <ul id="key-map-list">
          <For each={Object.keys(keyMap)}>
            {(key) => {
              return (
                <li>
                  <label htmlFor={key}>{formatCamelCase(key)}</label>
                  <input
                    id={key}
                    type="text"
                    value={formatKeyValue(keyMap[key])}
                    onChange={[handleKeyMapChange, key]}
                  />
                </li>
              );
            }}
          </For>
        </ul>
      </div>
    </div>
  );
};
