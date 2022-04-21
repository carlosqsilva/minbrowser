import webviews from '../webviews'
import {tasks} from "../tabState"

class NavigationButtons {
  public tabsList = document.getElementById('tabs-inner') as HTMLDivElement
  public container = document.getElementById('toolbar-navigation-buttons') as HTMLDivElement
  public backButton = document.getElementById('back-button') as HTMLButtonElement
  public forwardButton = document.getElementById('forward-button') as HTMLButtonElement
  
  public update() {
    if (!tasks.tabs.get(tasks.tabs.getSelected()!).url) {
      this.backButton.disabled = true
      this.forwardButton.disabled = true
      return
    }
    webviews.callAsync(tasks.tabs.getSelected()!, 'canGoBack', (err, canGoBack) => {
      if (err) {
        return
      }
      this.backButton.disabled = !canGoBack
    })
    webviews.callAsync(tasks.tabs.getSelected()!, 'canGoForward', (err, canGoForward) => {
      if (err) {
        return
      }
      this.forwardButton.disabled = !canGoForward
      if (canGoForward) {
        this.container.classList.add('can-go-forward')
      } else {
        this.container.classList.remove('can-go-forward')
      }
    })
  }
  constructor() {
    this.container.hidden = false

    this.backButton.addEventListener('click', (e) => {
      webviews.goBackIgnoringRedirects(tasks.tabs.getSelected())
    })

    this.forwardButton.addEventListener('click', () => {
      webviews.callAsync(tasks.tabs.getSelected()!, 'goForward')
    })

    this.container.addEventListener('mouseenter', () => {
      /*
      Prevent scrollbars from showing up when hovering the navigation buttons, if one isn't already shown
      This also works around a chromium bug where a flickering scrollbar is shown during the expanding animation:
      https://github.com/minbrowser/min/pull/1665#issuecomment-868551126
      */
      if (this.tabsList.scrollWidth <= this.tabsList.clientWidth) {
        this.tabsList.classList.add('disable-scroll')
      }
    })

    this.container.addEventListener('mouseleave', () => {
      this.tabsList.classList.remove('disable-scroll')
    })

    tasks.on('tab-selected', () => this.update())
    webviews.bindEvent('did-navigate', () => this.update())
    webviews.bindEvent('did-navigate-in-page', () => this.update())
  }
}

const navigationButtons = new NavigationButtons() 

export default navigationButtons
