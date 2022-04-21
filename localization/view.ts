import { languages } from "./common";

const defaultLanguage = "en-US";

export function getCurrentLanguage() {
  return navigator?.language || defaultLanguage; // default
}

export let userLanguage: string | null = null;

export function l(stringId: string) {
  if (!userLanguage) {
    userLanguage = getCurrentLanguage();
  }

  if (userLanguage in languages) {
    return languages[userLanguage].translations[stringId];
  }

  return languages[defaultLanguage].translations[stringId];
}
