import { Show } from "solid-js";
import { createStore } from "solid-js/store";

import settings from "../../js/util/settings/settingsContent";
import { l } from "../../localization/view";

interface Proxy {
  type: number;
  pacScript: string;
  proxyRules: string;
  proxyBypassRules: string;
}

type ProxyKey = keyof Proxy;

const [proxy, setProxy] = createStore<Proxy>({
  type: 0,
  pacScript: "",
  proxyRules: "",
  proxyBypassRules: "",
});

settings.get("proxy", (settingsProxy) => {
  if (!settingsProxy) settingsProxy = {};
  setProxy(settingsProxy);
});

const handleProxyTypeChange = (e: Event & { target: HTMLSelectElement }) => {
  setProxy("type", e.target.options.selectedIndex ?? 0);
};

const handleProxySettingsChange = (e: Event & { target: HTMLInputElement }) => {
  const { name, value } = e.target;
  const newValue = value.trim();

  setProxy(name as ProxyKey, newValue);

  settings.get("proxy", (settingsProxy) => {
    if (!settingsProxy) settingsProxy = {};
    settingsProxy[name] = newValue;
    settings.set("proxy", settingsProxy);
  });
};

export const ProxySettings = () => {
  return (
    <div class="settings-container" id="proxy-settings-container">
      <h3>{l("settingsProxyHeading")}</h3>

      <div class="setting-section" id="proxy-type-container">
        <select
          id="selected-proxy-type"
          // @ts-ignore
          onChange={handleProxyTypeChange}
        >
          <option>{l("settingsNoProxy")}</option>
          <option>{l("settingsManualProxy")}</option>
          <option>{l("settingsAutomaticProxy")}</option>
        </select>
      </div>

      <Show when={proxy.type === 1}>
        <div class="setting-section" id="manual-proxy-section">
          <div class="setting-option">
            <label for="proxy-rules-input">{l("settingsProxyRules")}</label>
            <input
              id="proxy-rules-input"
              type="text"
              name="proxyRules"
              placeholder="proxy.example.com:8080"
              // @ts-ignore
              onChange={handleProxySettingsChange}
            />
          </div>

          <div class="setting-option">
            <label for="proxy-bypass-rules-input">
              {l("settingsProxyBypassRules")}
            </label>
            <input
              name="proxyBypassRules"
              id="proxy-bypass-rules-input"
              placeholder="localhost, 127.0.0.1/8, ::1"
              // @ts-ignore
              onChange={handleProxySettingsChange}
            />
          </div>
        </div>
      </Show>

      <Show when={proxy.type === 2}>
        <div class="setting-option" id="pac-option">
          <label for="pac-url-input">
            {l("settingsProxyConfigurationURL")}
          </label>
          <input
            type="text"
            id="pac-url-input"
            placeholder="https://example.com/proxy.pac"
            // @ts-ignore
            onChange={handleProxySettingsChange}
          />
        </div>
      </Show>
    </div>
  );
};
