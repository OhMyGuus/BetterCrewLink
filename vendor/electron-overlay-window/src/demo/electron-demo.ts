import { app, BrowserWindow, globalShortcut } from 'electron'
import { overlayWindow } from '../'

// https://github.com/electron/electron/issues/25153
app.disableHardwareAcceleration()

let window: BrowserWindow

function createWindow () {
  window = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true
    },
    ...overlayWindow.WINDOW_OPTS
  })

  window.loadURL(`data:text/html;charset=utf-8,
    <head>
      <title>overlay-demo</title>
    </head>
    <body style="padding: 0; margin: 0;">
      <div style="position: absolute; width: 100%; height: 100%; border: 4px solid red; background: rgba(255,255,255,0.1); box-sizing: border-box; pointer-events: none;"></div>
      <div style="padding-top: 50vh; text-align: center;">
        <div style="padding: 16px; border-radius: 8px; background: rgb(255,255,255); border: 4px solid red; display: inline-block;">
          <span>Overlay Window</span>
          <span id="text1"></span>
          <br><span><b>CmdOrCtrl + Q</b> to toggle setIgnoreMouseEvents</span>
          <br><span><b>CmdOrCtrl + H</b> to "hide" overlay using CSS</span>
        </div>
      </div>
      <script>
        const electron = require('electron');

        electron.ipcRenderer.on('focus-change', (e, state) => {
          document.getElementById('text1').textContent = (state) ? ' (overlay is clickable) ' : 'clicks go through overlay'
        });

        electron.ipcRenderer.on('visibility-change', (e, state) => {
          if (document.body.style.display) {
            document.body.style.display = null
          } else {
            document.body.style.display = 'none'
          }
        });
      </script>
    </body>
  `)

  // NOTE: if you close Dev Tools overlay window will lose transparency 
  window.webContents.openDevTools({ mode: 'detach', activate: false })

  window.setIgnoreMouseEvents(true)

  makeDemoInteractive()

  overlayWindow.attachTo(window, 'Untitled - Notepad')
  overlayWindow.show();

}

function makeDemoInteractive () {
  let isInteractable = false

  function toggleOverlayState () {
    if (isInteractable) {
      window.setIgnoreMouseEvents(true)
      isInteractable = false
      overlayWindow.focusTarget()
      window.webContents.send('focus-change', false)
    } else {
      window.setIgnoreMouseEvents(false)
      isInteractable = true
      overlayWindow.activateOverlay()
      window.webContents.send('focus-change', true)
    }
  }

  globalShortcut.register('CmdOrCtrl + Q', toggleOverlayState)

  globalShortcut.register('CmdOrCtrl + H', () => {
    window.webContents.send('visibility-change', false)
  })
}

app.on('ready', () => {
  setTimeout(
    createWindow,
    process.platform === 'linux' ? 1000 : 0 // https://github.com/electron/electron/issues/16809
  )
})