import settings from "../settings/settings";
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
