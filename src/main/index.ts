// ---------------------------------------------------------------------------
// QuestDay — Electron main process. Owns the always-on-top widget window, the
// full management window, the system tray, and wiring to the store.
// ---------------------------------------------------------------------------

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, nativeTheme, screen } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { registerStoreIpc } from './ipc/store'
import { registerActiveModeIpc } from './ipc/activeMode'
import { registerBackupIpc } from './ipc/backup'
import {
  startActiveModeScheduler,
  stopActiveModeScheduler,
  setShowFriction,
  onFrictionResolved,
  handleForeground
} from './activeMode/scheduler'
import type { FrictionTrigger } from './activeMode/scheduler'
import { startDetector, stopDetector } from './activeMode/detector'
import { getDatabase, saveDatabase, onDatabaseChanged } from './db/store'
import { flushAutoBackup } from './backup/backup'
import { startPrayerReminders, samplePrayerReminder } from './prayer/reminder'
import type { PrayerReminderInfo } from '@shared/types'

let widgetWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let frictionWindow: BrowserWindow | null = null
let pendingFriction: FrictionTrigger | null = null
let prayerWindow: BrowserWindow | null = null
let pendingPrayer: PrayerReminderInfo | null = null
let tray: Tray | null = null
let isQuitting = false

const preload = join(__dirname, '../preload/index.mjs')

// Platform flag for the handful of macOS-specific window/tray tweaks below.
// (Windows behaviour is the default everywhere isMac is false.)
const isMac = process.platform === 'darwin'

// Active-mode background work (the 30s scheduler tick + the 2s foreground
// detector) is the only always-on cost; gate it on the master switch so a
// disabled feature uses zero idle CPU. Idempotent — safe to call on every change.
let activeModeRunning = false
function syncActiveMode(enabled: boolean): void {
  // Active Mode is Windows-only — it relies on a Win32/PowerShell foreground-window
  // detector. On macOS/Linux never start the scheduler/detector (they'd fail to
  // spawn, and the UI hides the tab there too). Keeps the Mac build error-free.
  if (process.platform !== 'win32') return
  if (enabled === activeModeRunning) return
  activeModeRunning = enabled
  if (enabled) {
    startActiveModeScheduler()
    startDetector((app, title) => handleForeground(app, title))
  } else {
    stopActiveModeScheduler()
    stopDetector()
  }
}

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

// Record the widget's shown/hidden state into settings so the Dashboard toggle button
// can label + act correctly. Send ONLY this field — saveDatabase deep-merges settings.
function syncWidgetVisible(visible: boolean): void {
  saveDatabase({ settings: { widgetVisible: visible } })
}

// --- Widget window (§9): small, frameless, always-on-top, movable, resizable -
function createWidgetWindow(): void {
  syncWidgetVisible(true)
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
    // sandbox stays false: electron-vite emits the preload as an ES module
    // (index.mjs), and Electron's sandbox requires a CommonJS preload — enabling
    // it leaves window.questday undefined. contextIsolation (on) + nodeIntegration
    // (off) + the navigation guards below are the active hardening instead.
    webPreferences: { preload, sandbox: false }
  })
  widgetWindow.setAlwaysOnTop(true, 'screen-saver')
  // macOS: keep the floating widget visible across Spaces and over full-screen apps.
  if (isMac) widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  loadRenderer(widgetWindow, 'widget.html')

  const persistBounds = () => {
    if (!widgetWindow) return
    const b = widgetWindow.getBounds()
    // Send only the field we own — saveDatabase deep-merges settings, so a stale
    // full-settings save from a renderer can't snap the widget back.
    saveDatabase({ settings: { widgetBounds: b } })
  }
  widgetWindow.on('moved', persistBounds)
  widgetWindow.on('resized', persistBounds)
  widgetWindow.on('closed', () => {
    widgetWindow = null
    syncWidgetVisible(false)
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
    // Custom deep-emerald title bar with native window buttons overlaid on Windows.
    // The colour must match --titlebar in theme.css / the .titlebar rule in styles.css.
    // On macOS, titleBarOverlay is unsupported: use 'hiddenInset' so the OS draws the
    // traffic-light buttons, and CSS (.platform-darwin .titlebar) pads the brand text
    // clear of them.
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? {} : { titleBarOverlay: { color: '#10362a', symbolColor: '#dfeee6', height: 40 } }),
    // sandbox stays false: electron-vite emits the preload as an ES module
    // (index.mjs), and Electron's sandbox requires a CommonJS preload — enabling
    // it leaves window.questday undefined. contextIsolation (on) + nodeIntegration
    // (off) + the navigation guards below are the active hardening instead.
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
    // sandbox stays false: electron-vite emits the preload as an ES module
    // (index.mjs), and Electron's sandbox requires a CommonJS preload — enabling
    // it leaves window.questday undefined. contextIsolation (on) + nodeIntegration
    // (off) + the navigation guards below are the active hardening instead.
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

// --- Gentle full-screen prayer reminder (v1.13) -----------------------------
// A calm, SILENT, dismissible overlay covering the primary display. Same window
// hardening as the friction window (sandbox false + contextIsolation + nav guards).
function ensurePrayerWindow(): BrowserWindow {
  if (prayerWindow && !prayerWindow.isDestroyed()) return prayerWindow
  const { bounds } = screen.getPrimaryDisplay()
  prayerWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#0b1020',
    webPreferences: { preload, sandbox: false }
  })
  prayerWindow.setAlwaysOnTop(true, 'screen-saver')
  loadRenderer(prayerWindow, 'prayer.html')
  prayerWindow.on('closed', () => {
    prayerWindow = null
  })
  return prayerWindow
}

function showPrayerReminder(data: PrayerReminderInfo): void {
  pendingPrayer = data
  const win = ensurePrayerWindow()
  const send = (): void => win.webContents.send('prayer:show', data)
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
  win.setAlwaysOnTop(true, 'screen-saver')
  win.show()
  win.focus()
}

function hidePrayerReminder(): void {
  pendingPrayer = null
  if (prayerWindow && !prayerWindow.isDestroyed()) prayerWindow.hide()
}

// --- System tray (§9) -------------------------------------------------------
function createTray(): void {
  const iconFile = resourcesPath('tray.png')
  let image = existsSync(iconFile) ? nativeImage.createFromPath(iconFile) : nativeImage.createEmpty()
  if (!image.isEmpty()) image = image.resize({ width: 16, height: 16 })
  // macOS menu-bar icons should be monochrome "template" images (they adapt to a
  // light/dark menu bar); the colored Windows icon would look wrong otherwise.
  if (isMac) image.setTemplateImage(true)
  tray = new Tray(image)
  tray.setToolTip('QuestDay')
  const menu = Menu.buildFromTemplate([
    { label: 'Open QuestDay', click: () => createMainWindow() },
    {
      label: 'Show/Hide Widget',
      click: () => {
        if (widgetWindow?.isVisible()) {
          widgetWindow.hide()
          syncWidgetVisible(false)
        } else createWidgetWindow()
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
    saveDatabase({ settings: { widgetExpanded: expanded } })
    if (widgetWindow) {
      const [w] = widgetWindow.getSize()
      widgetWindow.setSize(w, expanded ? 496 : 212, true)
    }
  })
  ipcMain.handle('widget:hide', () => {
    widgetWindow?.hide()
    syncWidgetVisible(false)
  })
  // Re-open the widget from the Dashboard (createWidgetWindow shows it if it already
  // exists, otherwise recreates it — same path the tray "Show/Hide Widget" uses).
  ipcMain.handle('widget:show', () => createWidgetWindow())
  // Prayer reminder: the renderer pulls the current reminder on mount, dismisses it,
  // and (from the settings "Preview" button) can trigger a sample.
  ipcMain.handle('prayer:requestPending', () => pendingPrayer)
  ipcMain.handle('prayer:dismiss', () => hidePrayerReminder())
  ipcMain.handle('prayer:test', () => showPrayerReminder(samplePrayerReminder()))
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
        syncWidgetVisible(true)
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

    // Defense-in-depth (local-only app): deny all popups, and block any
    // navigation away from the app's own origin. The app never opens windows or
    // navigates externally, so "deny by default" can't break a legitimate flow.
    app.on('web-contents-created', (_e, contents) => {
      contents.setWindowOpenHandler(() => ({ action: 'deny' }))
      contents.on('will-navigate', (e, url) => {
        try {
          if (new URL(url).origin !== new URL(contents.getURL()).origin) e.preventDefault()
        } catch {
          e.preventDefault()
        }
      })
    })
    // Drop the default File/Edit/View/Window menu bar (we don't use it), and ask
    // the OS for dark window chrome so the title bar matches the app instead of
    // showing as a light/gray bar.
    Menu.setApplicationMenu(null)
    nativeTheme.themeSource = 'dark'
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
    onDatabaseChanged((db) => {
      applyLaunchOnLogin(db.settings.launchOnLogin)
      // Start/stop the background timers as the master switch flips, so a disabled
      // feature costs nothing on a tray app that runs for days.
      syncActiveMode(db.settings.activeModeEnabled)
    })
    ensureFrictionWindow()
    // Surface the soft-friction prompt in its own always-on-top window so it's
    // visible over any app, even when the main window is closed to the tray.
    setShowFriction((data) => showFriction(data))
    syncActiveMode(getDatabase().settings.activeModeEnabled)
    // Gentle prayer-time reminders (opt-in; the poll no-ops while disabled/unconfigured).
    startPrayerReminders(getDatabase, (data) => showPrayerReminder(data))

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
    // Drain any debounced backup so the last few seconds of changes are captured.
    flushAutoBackup()
  })
}
