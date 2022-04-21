import settings from './settings/settings'

// if (typeof require !== 'undefined') {
//   var settings = require('util/settings.js')
// }

interface PasswordManager {
  name: string
}

export const passwordManagers: Record<string, PasswordManager> = {
  none: {
    name: 'none'
  },
  Bitwarden: {
    name: 'Bitwarden'
  },
  '1Password': {
    name: '1Password'
  },
  'Built-in password manager': {
    name: 'Built-in password manager'
  }
}

export let  currentPasswordManager: PasswordManager | null = null

export function getCurrentPasswordManager() {
  return currentPasswordManager
}

settings.listen('passwordManager', (value) => {
  if (value && value.name) {
    currentPasswordManager = value
  } else {
    currentPasswordManager = passwordManagers['Built-in password manager']
  }
})

