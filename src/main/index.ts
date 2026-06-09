// ---------------------------------------------------------------------------
// QuestDay — Electron main process. Owns the always-on-top widget window, the
// full management window, the system tray, and wiring to the store.
// ---------------------------------------------------------------------------

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, nativeTheme } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { registerStoreIpc } from './ipc/store'
import { registerActiveModeIpc } from './ipc/activeMode'
import { registerBackupIpc } from './ipc/backup'
import {
  startActiveModeScheduler,
  setShowFriction,
  onFrictionResolved,
  handleForeground
} from './activeMode/scheduler'
import type { FrictionTrigger } from './activeMode/scheduler'
import { startDetector, stopDetector } from './activeMode/detector'
import { getDatabase, saveDatabase, onDatabaseChanged } from './db/store'

let widgetWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let frictionWindow: BrowserWindow | null = null
let pendingFriction: FrictionTrigger | null = null
let tray: Tray | null = null
let isQuitting = false

const preload = join(__dirname, '../preload/index.mjs')

// True when Windows started us at sign-in (the login item registers `--hidden`):
// open just the widget + tray, not the management window.
const launchedHidden = process.argv.includes('--hidden')

// --- Launch at login (mirrors settings.launchOnLogin into the registry) ------
let appliedLaunchOnLogin: boolean | null = null
function applyLaunchOnLogin(enabled: boolean): void {
  // Dev runs would register electron.exe itself as the login item — skip them.
  if (!app.isPackaged) return
  if (appliedLaunchOnLogin === enabled) return
  appliedLaunchOnLogin = enabled
  app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] })
}

function resourcesPath(file: string): string {
  // Dev: <projectRoot>/resources. Packaged: extraResources land in
  // <resourcesPath>/resources (see electron-builder config).
  const base = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(app.getAppPath(), 'resources')
  return join(base, file)
}

function loadRenderer(win: BrowserWindow, htmlFile: string): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(`${devUrl}/${htmlFile}`)
  } else {
    void win.loadFile(join(__dirname, `../renderer/${htmlFile}`))
  }
}

// --- Widget window (§9): small, frameless, always-on-top, movable, resizable -
function createWidgetWindow(): void {
  if (widgetWindow) {
    widgetWindow.show()
    return
  }
  const saved = getDatabase().settings.widgetBounds
  widgetWindow = new BrowserWindow({
    width: saved?.width ?? 320,
    height: saved?.height ?? 212,
    x: saved?.x ?? 24,
    y: saved?.y ?? 24,
    minWidth: 180,
    minHeight: 88,
    frame: false,
    transparent: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: { preload, sandbox: false }
  })
  widgetWindow.setAlwaysOnTop(true, 'screen-saver')
  loadRenderer(widgetWindow, 'widget.html')

  const persistBounds = () => {
    if (!widgetWindow) return
    const b = widgetWindow.getBounds()
    saveDatabase({ settings: { ...getDatabase().settings, widgetBounds: b } })
  }
  widgetWindow.on('moved', persistBounds)
  widgetWindow.on('resized', persistBounds)
  widgetWindow.on('closed', () => {
    widgetWindow = null
  })
}

// --- Full management window (§9 expand / quests / settings) ------------------
function createMainWindow(): void {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return
  }
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 740,
    minWidth: 720,
    minHeight: 540,
    title: 'QuestDay',
    show: true,
    backgroundColor: '#0e1512',
    // Custom deep-emerald title bar with native window buttons overlaid. The
    // colour must match --titlebar in theme.css / the .titlebar rule in styles.css.
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#10362a', symbolColor: '#dfeee6', height: 40 },
    webPreferences: { preload, sandbox: false }
  })
  loadRenderer(mainWindow, 'index.html')
  mainWindow.on('close', (e) => {
    // Tray app: closing the window hides it rather than quitting.
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// --- Always-on-top soft-friction window (§8) --------------------------------
function ensureFrictionWindow(): BrowserWindow {
  if (frictionWindow && !frictionWindow.isDestroyed()) return frictionWindow
  frictionWindow = new BrowserWindow({
    width: 520,
    height: 360,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    backgroundColor: '#11131a',
    webPreferences: { preload, sandbox: false }
  })
  frictionWindow.setAlwaysOnTop(true, 'screen-saver')
  loadRenderer(frictionWindow, 'friction.html')
  frictionWindow.on('closed', () => {
    frictionWindow = null
  })
  return frictionWindow
}

function showFriction(data: FrictionTrigger): void {
  pendingFriction = data
  const win = ensureFrictionWindow()
  const send = () => win.webContents.send('activeMode:friction', data)
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
  win.center()
  win.setAlwaysOnTop(true, 'screen-saver')
  win.show()
  win.focus()
}

function hideFriction(): void {
  pendingFriction = null
  if (frictionWindow && !frictionWindow.isDestroyed()) frictionWindow.hide()
}

// --- System tray (§9) -------------------------------------------------------
function createTray(): void {
  const iconFile = resourcesPath('tray.png')
  let image = existsSync(iconFile) ? nativeImage.createFromPath(iconFile) : nativeImage.createEmpty()
  if (!image.isEmpty()) image = image.resize({ width: 16, height: 16 })
  tray = new Tray(image)
  tray.setToolTip('QuestDay')
  const menu = Menu.buildFromTemplate([
    { label: 'Open QuestDay', click: () => createMainWindow() },
    {
      label: 'Show/Hide Widget',
      click: () => {
        if (widgetWindow?.isVisible()) widgetWindow.hide()
        else createWidgetWindow()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => createMainWindow())
}

// --- Window-control IPC -----------------------------------------------------
function registerWindowIpc(): void {
  ipcMain.handle('window:openMain', () => createMainWindow())
  ipcMain.handle('widget:setExpanded', (_e, expanded: boolean) => {
    saveDatabase({ settings: { ...getDatabase().settings, widgetExpanded: expanded } })
    if (widgetWindow) {
      const [w] = widgetWindow.getSize()
      widgetWindow.setSize(w, expanded ? 496 : 212, true)
    }
  })
  ipcMain.handle('widget:hide', () => widgetWindow?.hide())
  ipcMain.handle('friction:requestPending', () => pendingFriction)
  ipcMain.handle('friction:dismiss', (_e, proceeded: boolean) => {
    const kind = pendingFriction?.kind ?? 'soft'
    hideFriction()
    // On "back to my quest", pull focus to QuestDay so the distracting app
    // behind the prompt doesn't instantly re-trigger. (Not on a break pass —
    // the scheduler restores the user's app instead.)
    if (!proceeded) {
      if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.show()
        widgetWindow.focus()
      } else {
        createMainWindow()
        mainWindow?.show()
        mainWindow?.focus()
      }
    }
    onFrictionResolved(Boolean(proceeded), kind)
  })
}

const singleLock = app.requestSingleInstanceLock()
if (!singleLock) {
  app.quit()
} else {
  app.on('second-instance', () => createMainWindow())

  app.whenReady().then(() => {
    // Required on Windows for OS notifications to attribute to the app.
    app.setAppUserModelId('com.questday.app')
    // Drop the default File/Edit/View/Window menu bar (we don't use it), and ask
    // the OS for dark window chrome so the title bar matches the app instead of
    // showing as a light/gray bar.
    Menu.setApplicationMenu(null)
    nativeTheme.themeSource = 'dark'
    // Ensure the widget sits within the visible work area on first run.
    screen.getPrimaryDisplay()
    registerStoreIpc()
    registerWindowIpc()
    registerActiveModeIpc()
    registerBackupIpc()
    createTray()
    createWidgetWindow()
    if (!launchedHidden) createMainWindow()
    // Keep the OS login item in sync with the setting — now (covers fresh
    // installs and restored backups) and on every future change.
    applyLaunchOnLogin(getDatabase().settings.launchOnLogin)
    onDatabaseChanged((db) => applyLaunchOnLogin(db.settings.launchOnLogin))
    startActiveModeScheduler()
    ensureFrictionWindow()
    // Surface the soft-friction prompt in its own always-on-top window so it's
    // visible over any app, even when the main window is closed to the tray.
    setShowFriction((data) => showFriction(data))
    startDetector((app, title) => handleForeground(app, title))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWidgetWindow()
    })
  })

  // Tray app: keep running when all windows are closed.
  app.on('window-all-closed', () => {
    /* stay alive in the tray */
  })

  app.on('before-quit', () => {
    isQuitting = true
    stopDetector()
  })
}
