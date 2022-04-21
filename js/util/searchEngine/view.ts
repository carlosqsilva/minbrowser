import settings from "../settings/settingsContent";
import { SearchEngine } from "./common";
export { searchEngines, SearchEngine } from "./common";
export const searchEngine = new SearchEngine(settings);
