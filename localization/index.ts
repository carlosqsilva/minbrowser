// @ts-check

interface Translation {
  name: string,
  identifier: string
  rtl?: boolean
  translations: Record<string, string>
}

const languages: Record<string, Translation> = {
  "en-US": require("./languages/en-US"),
  "pt-BR": require("./languages/pt-BR")
}

const { app } = require("electron")

export function getCurrentLanguage() {
  // TODO add a setting to change the language to something other than the default

  let language = 'en-US' // default

  if (typeof navigator !== 'undefined') { // renderer process
    language = navigator.language
  } else if (typeof app !== 'undefined') { // main process
    language = app.getLocale()
  } else {
    // nothing worked, fall back to default
  }

  return language
}

export let userLanguage: string | null = null

export function l(stringId: string) {
  if (!userLanguage) {
    userLanguage = getCurrentLanguage()
  }
  
  if (userLanguage in languages) {
    return languages[userLanguage].translations[stringId]
  }

  return languages["en-US"].translations[stringId]
}

/* for static HTML pages
insert a localized string into all elements with a [data-string] attribute
set the correct attributes for all elements with a [data-label] attribute
set the value attribute for all elements with a [data-value] attribute
 */

if (typeof document !== 'undefined') {
  if (languages[getCurrentLanguage()] && languages[getCurrentLanguage()].rtl) {
    document.body.classList.add('rtl')
  }

  document.querySelectorAll('[data-string]').forEach(function (el) {
    var str = l(el.getAttribute('data-string') as string)
    if (typeof str === 'string') {
      el.textContent = str
      // @ts-ignore
    } else if (str && str.unsafeHTML && el.hasAttribute('data-allowHTML')) {
      // @ts-ignore
      el.innerHTML = str.unsafeHTML
    }
  })
  document.querySelectorAll('[data-label]').forEach(function (el) {
    var str = l(el.getAttribute('data-label') as string)
    if (typeof str === 'string') {
      el.setAttribute('title', str)
      el.setAttribute('aria-label', str)
    } else {
      throw new Error('invalid data-label value: ' + str)
    }
  })
  document.querySelectorAll('[data-value]').forEach(function (el) {
    var str = l(el.getAttribute('data-value') as string)
    if (typeof str === 'string') {
      el.setAttribute('value', str)
    } else {
      throw new Error('invalid data-value value: ' + str)
    }
  })
}