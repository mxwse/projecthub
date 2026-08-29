import { BrowserWindow, app, shell } from 'electron'
import path from 'path'
import { flush, initDatabase } from './db'
import { registerIpcHandlers } from './ipc'
import { killAllTerminals, registerTerminalHandlers } from './terminal'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    title: 'ProjectHub',
    backgroundColor: '#121210',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Nur http und https nach draussen geben. Ohne die Pruefung koennte eine
    // file:- oder Custom-Protocol-URL einen beliebigen externen Handler
    // starten. files:openExternal in ipc.ts prueft an derselben Stelle genauso.
    if (/^https?:\/\//.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  registerIpcHandlers(() => mainWindow)
  registerTerminalHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  flush()
  killAllTerminals()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  flush()
  killAllTerminals()
})
