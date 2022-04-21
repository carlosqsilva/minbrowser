import { l } from "../../localization/view";
import { createStore } from "solid-js/store";
import settings from "../../js/util/settings/settingsContent";

type DarkModeOption = -1 | 0 | 1 | 2;
enum DarkMode {
  Disable = -1,
  Night = 0,
  Always = 1,
  System = 2,
}

const [state, setState] = createStore({
  siteTheme: true,
  showDividerBetweenTabs: false,
  darkMode: DarkMode.System,
});

settings.get("darkMode", (value) => {
  setState("darkMode", value ?? DarkMode.System);
});

settings.get("siteTheme", (value) => {
  setState("siteTheme", value === true || value === undefined);
});

settings.get("showDividerBetweenTabs", (value) => {
  setState("showDividerBetweenTabs", value === true);
});

const handleDarkModeChange = (mode: DarkModeOption) => {
  setState("darkMode", mode ?? DarkMode.System);
  settings.set("darkMode", mode ?? DarkMode.System);
};

const handleSiteThemeChange = (e) => {
  setState("siteTheme", e.target.checked);
  settings.set("siteTheme", e.target.checked);
};

const handleShowDividerChange = (e) => {
  setState("showDividerBetweenTabs", e.target.checked);
  settings.set("showDividerBetweenTabs", e.target.checked);
};

export function AppearanceSettings() {
  return (
    <div class="settings-container" id="appearance-settings-container">
      <h3>{l("settingsAppearanceHeading")}</h3>

      <label for="dark-mode-container">{l("settingsEnableDarkMode")}</label>

      <div class="setting-section" id="dark-mode-container">
        <div class="setting-option">
          <input
            type="radio"
            name="darkMode"
            id="dark-mode-never"
            checked={state.darkMode === DarkMode.Disable}
            onChange={[handleDarkModeChange, DarkMode.Disable]}
          />
          <label for="dark-mode-never">{l("settingsDarkModeNever")}</label>
        </div>

        <div class="setting-option">
          <input
            type="radio"
            name="darkMode"
            id="dark-mode-night"
            checked={state.darkMode === DarkMode.Night}
            onChange={[handleDarkModeChange, DarkMode.Night]}
          />
          <label for="dark-mode-night">{l("settingsDarkModeNight")}</label>
        </div>

        <div class="setting-option">
          <input
            type="radio"
            name="darkMode"
            id="dark-mode-always"
            checked={state.darkMode === DarkMode.Always}
            onChange={[handleDarkModeChange, DarkMode.Always]}
          />
          <label for="dark-mode-always">{l("settingsDarkModeAlways")}</label>
        </div>

        <div class="setting-option">
          <input
            type="radio"
            name="darkMode"
            id="dark-mode-system"
            checked={state.darkMode === DarkMode.System}
            onChange={[handleDarkModeChange, DarkMode.System]}
          />
          <label for="dark-mode-system">{l("settingsDarkModeSystem")}</label>
        </div>
      </div>

      <div class="setting-section">
        <input
          type="checkbox"
          id="checkbox-site-theme"
          checked={state.siteTheme}
          onChange={handleSiteThemeChange}
        />
        <label for="checkbox-site-theme">{l("settingsSiteThemeToggle")}</label>
      </div>

      <div class="setting-section">
        <input
          type="checkbox"
          id="checkbox-show-divider"
          checked={state.showDividerBetweenTabs}
          onChange={handleShowDividerChange}
        />
        <label for="checkbox-show-divider">
          {l("settingsShowDividerToggle")}
        </label>
      </div>
    </div>
  );
}
