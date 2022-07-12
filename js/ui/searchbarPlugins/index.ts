import { registerSearchbarPlugins } from "../searchbar/searchbar";

import { developmentModeNotification } from "./developmentNotification";
import { instantAnswer } from "./instantAnswer";
import { searchSuggestion } from "./searchSuggestions";
import { openTabs } from "./openTabs";
import { fullTextPlaces, placesPlugin } from "./places";
import { placesSuggestions } from "./placesSuggestions";
import { restoreTab } from "./restoreTab";

export const startSearchbarPlugins = () =>
  registerSearchbarPlugins(
    restoreTab,
    developmentModeNotification,
    placesPlugin,
    placesSuggestions,
    fullTextPlaces,
    openTabs,
    instantAnswer,
    searchSuggestion
  );
