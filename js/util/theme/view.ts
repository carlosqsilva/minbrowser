import settings from "../settings/settingsContent";
import { enableDarkMode, disableDarkMode } from "./theme";

(() => {
  settings.listen("darkThemeIsActive", (value) => {
    if (value === true) {
      enableDarkMode();
    } else {
      disableDarkMode();
    }
  });
})();
