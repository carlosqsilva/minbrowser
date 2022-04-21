import { createStore } from "solid-js/store";

import { l } from "../../localization/view";
import settings from "../../js/util/settings/settingsContent";
import { showRestartRequiredBanner } from "./bannerSettings";

const [state, setState] = createStore({
  customUserAgent: "",
  useCustomUserAgent: false,
  openTabsInBackground: false,
  enableAutoplay: false,
});

/* tabs in foreground setting */

settings.get("openTabsInForeground", (value) => {
  setState("openTabsInBackground", Boolean(value));
});

const handleTabsInBackgroundChange = (e) => {
  const value = e.target.checked;
  setState("openTabsInBackground", value);
  settings.set("openTabsInForeground", value);
};

/* media autoplay setting */

settings.get("enableAutoplay", (value) => {
  setState("enableAutoplay", Boolean(value));
});

const handleAutoPlayChange = (e) => {
  const value = e.target.checked;
  setState("enableAutoplay", value);
  settings.set("enableAutoplay", value);
};

/* user agent settting */

settings.get("customUserAgent", (value) => {
  setState("customUserAgent", value ?? "");
});

settings.get("useCustomUserAgent", (value) => {
  setState("useCustomUserAgent", Boolean(value));
});

const handleCustomUserAgentChange = (e) => {
  setState("customUserAgent", e.target.value);
  showRestartRequiredBanner();
};

const handleUseCustomUserAgentChange = (e) => {
  setState("useCustomUserAgent", e.target.checked);
  showRestartRequiredBanner();
};

export const FeatureSettings = () => {
  return (
    <div class="settings-container" id="additional-settings-container">
      <h3>{l("settingsAdditionalFeaturesHeading")}</h3>

      <div class="setting-section" id="section-open-tabs-in-foreground">
        <input
          type="checkbox"
          id="checkbox-open-tabs-in-foreground"
          checked={state.openTabsInBackground}
          onChange={handleTabsInBackgroundChange}
        />
        <label for="checkbox-open-tabs-in-foreground">
          {l("settingsOpenTabsInForegroundToggle")}
        </label>
      </div>

      <div class="setting-section" id="section-user-agent">
        <input
          type="checkbox"
          id="checkbox-user-agent"
          checked={state.useCustomUserAgent}
          onChange={handleUseCustomUserAgentChange}
        />
        <label for="checkbox-user-agent">{l("settingsUserAgentToggle")}</label>
        <input
          type="text"
          id="input-user-agent"
          value={state.customUserAgent}
          onInput={handleCustomUserAgentChange}
          hidden={!state.useCustomUserAgent}
          style="
            vertical-align: middle;
            margin-left: 1em;
            width: 375px;
            max-width: 80vw;
          "
        />
      </div>

      <div class="setting-section">
        <input
          type="checkbox"
          id="checkbox-enable-autoplay"
          checked={state.enableAutoplay}
          onChange={handleAutoPlayChange}
        />
        <label for="checkbox-enable-autoplay">
          {l("settingsAutoplayToggle")}
        </label>
      </div>
    </div>
  );
};
