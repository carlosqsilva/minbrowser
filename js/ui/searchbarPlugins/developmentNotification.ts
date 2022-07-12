import { getConfig } from "../settings/config";
import * as searchbar from "../searchbar";

const NAME = "developmentModeNotification";

export const developmentModeNotification: searchbar.Plugin = {
  name: NAME,
  trigger: () => getConfig("development-mode"),
  showResults: () => {
    searchbar.resetPlugin(NAME);
    searchbar.addResult(NAME, {
      title: "Development Mode Enabled",
    });
  },
};
