// @ts-check

import fs from 'fs'
import path from 'path'
import {app, ipcMain as ipc, screen} from 'electron'
import type { BrowserWindow, Event } from "electron"

import settings from "../js/util/settings/settingsMain"
const { destroyAllViews } = require("./viewManager")
import { createMainWindow, getMainWindow, destroyMainWindow } from "./window"
const registerRemoteAction = require("./remoteActions")

const { 
  createAppMenu, 
  createDockMenu 
} = require("./menu")

let isInstallerRunning = false
let displayVersion = false
let isDevelopmentMode = false

process.argv.forEach(arg => {
  switch (arg) {
    case "-v":
    case "--version":
      displayVersion = true;
      break;
    case "--development-mode":
    isDevelopmentMode = true;
    break;
    default:
      break;
  }  
})

if (displayVersion) {
  console.log('Min: ' + app.getVersion())
  console.log('Chromium: ' + process.versions.chrome)
  process.exit()
}

if (isDevelopmentMode) {
  app.setPath('userData', app.getPath('userData') + '-development')
}

// workaround for flicker when focusing app (https://github.com/electron/electron/issues/17942)
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true')



const userDataPath = app.getPath('userData')

const browserPage = 'file://' + __dirname + '/index.html'

let mainWindowIsMinimized = false // workaround for https://github.com/minbrowser/min/issues/1074
let isFocusMode = false
let appIsReady = false

const isFirstInstance = app.requestSingleInstanceLock()

if (!isFirstInstance) {
  app.quit()
  process.exit(0)
}

function sendIPCToWindow(action: string, data?: Record<string, any>) {
  const mainWindow = getMainWindow()
  
  if (mainWindow) {
    mainWindow.webContents.send(action, data || {})
  } else { // if there are no windows, create a new one
    createApp((window) => {
      window.webContents.send(action, data || {})
    })
  }
}

// function createWindow(cb: (win: BrowserWindow) => void) {
//     const window = createWindowWithBounds(bounds)

//     if (cb) {
//       cb(window)
//     }
// }

async function createApp(cb?: (window: BrowserWindow) => void ) {
  const mainWindow = await createMainWindow(isDevelopmentMode)

  // and load the index.html of the app.
  mainWindow.webContents.openDevTools();
  
  mainWindow.loadURL(browserPage)

  mainWindow.on('close', function () {
    destroyAllViews(mainWindow)
    // save the window size for the next launch of the app
    if (mainWindow) {
      fs.writeFileSync(
        path.join(userDataPath, 'windowBounds.json'), 
        JSON.stringify(mainWindow.getBounds())
      )
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    destroyMainWindow()
    mainWindowIsMinimized = false
  })

  mainWindow.on('focus', function () {
    if (!mainWindowIsMinimized) {
      sendIPCToWindow( 'windowFocus')
    }
  })

  mainWindow.on('minimize', function () {
    sendIPCToWindow( 'minimize')
    mainWindowIsMinimized = true
  })

  mainWindow.on('restore', function () {
    mainWindowIsMinimized = false
  })

  mainWindow.on('maximize', function () {
    sendIPCToWindow( 'maximize')
  })

  mainWindow.on('unmaximize', function () {
    sendIPCToWindow( 'unmaximize')
  })

  mainWindow.on('enter-full-screen', function () {
    sendIPCToWindow( 'enter-full-screen')
  })

  mainWindow.on('leave-full-screen', function () {
    sendIPCToWindow( 'leave-full-screen')
    // https://github.com/minbrowser/min/issues/1093
    mainWindow.setMenuBarVisibility(false)
  })

  mainWindow.on('enter-html-full-screen', function () {
    sendIPCToWindow( 'enter-html-full-screen')
  })

  mainWindow.on('leave-html-full-screen', function () {
    sendIPCToWindow( 'leave-html-full-screen')
    // https://github.com/minbrowser/min/issues/952
    mainWindow.setMenuBarVisibility(false)
  })

  // prevent remote pages from being loaded using drag-and-drop, since they would have node access
  mainWindow.webContents.on('will-navigate', (e: Event, url: string) => {
    if (url !== browserPage) {
      e.preventDefault()
    }
  })

  registerRemoteAction(mainWindow)
  
  return mainWindow
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
  settings.set('restartNow', false)
  appIsReady = true

  /* the installer launches the app to install registry items and shortcuts,
  but if that's happening, we shouldn't display anything */
  if (isInstallerRunning) {
    return
  }

  createApp((mainWindow) => {
    mainWindow.webContents.on('did-finish-load', function () {
      // if a URL was passed as a command line argument (probably because Min is set as the default browser on Linux), open it.
      // handleCommandLineArguments(process.argv)

      // there is a URL from an "open-url" event (on Mac)
      if (global.URLToOpen) {
        // if there is a previously set URL to open (probably from opening a link on macOS), open it
        sendIPCToWindow('addTab', {
          url: global.URLToOpen
        })
        global.URLToOpen = null
      }
    })
  })

  createAppMenu(sendIPCToWindow)
  createDockMenu()
})

app.on('open-url', function (e, url) {
  if (appIsReady) {
    sendIPCToWindow('addTab', {
      url: url
    })
  } else {
    global.URLToOpen = url // this will be handled later in the createWindow callback
  }
})

app.on('second-instance', function (e, argv, workingDir) {
  const mainWindow = getMainWindow()
  
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
})

/**
 * Emitted when the application is activated, which usually happens when clicks on the applications's dock icon
 * https://github.com/electron/electron/blob/master/docs/api/app.md#event-activate-os-x
 *
 * Opens a new tab when all tabs are closed, and min is still open by clicking on the application dock icon
 */
app.on('activate', function (/* e, hasVisibleWindows */) {
  if (!getMainWindow() && appIsReady) { // sometimes, the event will be triggered before the app is ready, and creating new windows will fail
    createApp()
  }
})

ipc.on('focusMainWebContents', function () {
  getMainWindow()?.webContents.focus()
})

ipc.on('quit', function () {
  app.quit()
})
