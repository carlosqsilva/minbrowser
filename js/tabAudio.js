// @ts-check

const webviews = require('./webviews.js')
const keybindings = require('./keybindings.js')

const {tasks} = require("./tabState")

const tabAudio = {
  muteIcon: 'carbon:volume-mute',
  volumeIcon: 'carbon:volume-up',
  getButton: function (tabId) {
    var button = document.createElement('button')
    button.className = 'tab-icon tab-audio-button i'

    button.setAttribute('data-tab', tabId)
    button.setAttribute('role', 'button')

    button.addEventListener('click', function (e) {
      e.stopPropagation()
      tabAudio.toggleAudio(tabId)
    })

    tabAudio.updateButton(tabId, button)

    return button
  },
  updateButton: function (tabId, button) {
    var button = button || document.querySelector('.tab-audio-button[data-tab="{id}"]'.replace('{id}', tabId))
    var tab = tasks.tabs.get(tabId)

    var muteIcon = tabAudio.muteIcon
    var volumeIcon = tabAudio.volumeIcon

    if (tab.muted) {
      button.hidden = false
      button.classList.remove(volumeIcon)
      button.classList.add(muteIcon)
    } else if (tab.hasAudio) {
      button.hidden = false
      button.classList.add(volumeIcon)
      button.classList.remove(muteIcon)
    } else {
      button.hidden = true
    }
  },
  toggleAudio: function (tabId) {
    var tab = tasks.tabs.get(tabId)
    // can be muted if has audio, can be unmuted if muted
    if (tab.hasAudio || tab.muted) {
      webviews.callAsync(tabId, 'setAudioMuted', !tab.muted)
      tasks.tabs.update(tabId, { muted: !tab.muted })
    }
  },
  initialize: function () {
    keybindings.defineShortcut('toggleTabAudio', function () {
      tabAudio.toggleAudio(tasks.tabs.getSelected())
    })

    webviews.bindEvent('media-started-playing', function (tabId) {
      tasks.tabs.update(tabId, { hasAudio: true })
    })
    webviews.bindEvent('media-paused', function (tabId) {
      tasks.tabs.update(tabId, { hasAudio: false })
    })
  }
}

tabAudio.initialize()

module.exports = tabAudio
