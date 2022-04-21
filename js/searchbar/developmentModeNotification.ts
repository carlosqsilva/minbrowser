// @ts-check

import { getConfig } from "../util/utils";
import searchbarPlugins from "./searchbarPlugins";

(() => {
  searchbarPlugins.register("developmentModeNotification", {
    index: 0,
    trigger: () => getConfig("development-mode"),
    showResults: () => {
      searchbarPlugins.reset("developmentModeNotification");
      searchbarPlugins.addResult("developmentModeNotification", {
        title: "Development Mode Enabled",
      });
    },
  });
})();
