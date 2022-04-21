/* fades out tabs that are inactive */

import tabBar from '../navbar/tabBar'
import { tasks }  from "../tabState"

class TabActivity {
  public minFadeAge = 330000

  public refresh() {
    requestAnimationFrame(() => {
      const tabSet = tasks.tabs.get()
      const selected = tasks.tabs.getSelected()
      const time = Date.now()

      tabSet.forEach((tab) => {
        if (selected === tab.id) { // never fade the current tab
          tabBar.getTab(tab.id).classList.remove('fade')
          return
        }
        if (time - tab.lastActivity > this.minFadeAge) { // the tab has been inactive for greater than minActivity, and it is not currently selected
          tabBar.getTab(tab.id).classList.add('fade')
        } else {
          tabBar.getTab(tab.id).classList.remove('fade')
        }
      })
    })
  }

  constructor() {
    setInterval(() => this.refresh(), 7500)

    tasks.on('tab-selected', () => this.refresh())
  }
}

export default new TabActivity()
