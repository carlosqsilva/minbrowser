import { languages } from "./common";

export function getCurrentLanguage() {
  // TODO add a setting to change the language to something other than the default

  let language = "en-US"; // default

  // console.log(navigator?.language, app.getLocale());
  if (typeof navigator !== "undefined") {
    // renderer process
    language = navigator.language;
  } else if (typeof module !== "undefined") {
    // main process
    language = require("electron").app.getLocale();
  } else {
    // nothing worked, fall back to default
  }

  return language;
}

export let userLanguage: string | null = null;

export function l(stringId: string) {
  if (!userLanguage) {
    userLanguage = getCurrentLanguage();
  }

  if (userLanguage in languages) {
    return languages[userLanguage].translations[stringId];
  }

  return languages["en-US"].translations[stringId];
}

/* for static HTML pages
insert a localized string into all elements with a [data-string] attribute
set the correct attributes for all elements with a [data-label] attribute
set the value attribute for all elements with a [data-value] attribute
 */

if (typeof document !== "undefined") {
  if (languages[getCurrentLanguage()] && languages[getCurrentLanguage()].rtl) {
    document.body.classList.add("rtl");
  }

  document.querySelectorAll("[data-string]").forEach((el) => {
    const str = l(el.getAttribute("data-string") as string);
    if (typeof str === "string") {
      el.textContent = str;
      // @ts-ignore
    } else if (str && str.unsafeHTML && el.hasAttribute("data-allowHTML")) {
      // @ts-ignore
      el.innerHTML = str.unsafeHTML;
    }
  });

  document.querySelectorAll("[data-label]").forEach((el) => {
    const str = l(el.getAttribute("data-label") as string);
    if (typeof str === "string") {
      el.setAttribute("title", str);
      el.setAttribute("aria-label", str);
    } else {
      throw new Error("invalid data-label value: " + str);
    }
  });

  document.querySelectorAll("[data-value]").forEach((el) => {
    const str = l(el.getAttribute("data-value") as string);
    if (typeof str === "string") {
      el.setAttribute("value", str);
    } else {
      throw new Error("invalid data-value value: " + str);
    }
  });
}
