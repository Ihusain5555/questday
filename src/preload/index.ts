// QuestDay — preload bridge. Exposes a minimal, typed `window.questday` API to
// both renderer windows via contextBridge (contextIsolation stays on).

import { contextBridge, ipcRenderer } from 'electron'
import type { Database, DatabasePatch } from '@shared/types'

const api = {
  getState: (): Promise<Database> => ipcRenderer.invoke('store:getState'),
  saveState: (patch: DatabasePatch): Promise<Database> => ipcRenderer.invoke('store:save', patch),
  /** Subscribe to state pushed from the main process (cross-window sync). */
  onChange: (cb: (db: Database) => void): (() => void) => {
    const listener = (_e: unknown, db: Database) => cb(db)
    ipcRenderer.on('store:changed', listener)
    return () => ipcRenderer.removeListener('store:changed', listener)
  },
  openMainWindow: (): Promise<void> => ipcRenderer.invoke('window:openMain'),
  widget: {
    setExpanded: (expanded: boolean): Promise<void> =>
      ipcRenderer.invoke('widget:setExpanded', expanded),
    hide: (): Promise<void> => ipcRenderer.invoke('widget:hide')
  },
  friction: {
    dismiss: (proceeded: boolean): Promise<void> =>
      ipcRenderer.invoke('friction:dismiss', proceeded),
    requestPending: (): Promise<FrictionTrigger | null> =>
      ipcRenderer.invoke('friction:requestPending')
  },
  backup: {
    export: (): Promise<BackupResult> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<BackupResult> => ipcRenderer.invoke('backup:import'),
    /** Start fresh: snapshots current data to backups/, then resets to defaults. */
    resetAll: (): Promise<void> => ipcRenderer.invoke('data:reset')
  },
  activeMode: {
    test: (): Promise<void> => ipcRenderer.invoke('activeMode:test'),
    snooze: (): Promise<void> => ipcRenderer.invoke('activeMode:snooze'),
    simulateForeground: (app: string, title: string): Promise<void> =>
      ipcRenderer.invoke('activeMode:simulateForeground', app, title),
    /** Subscribe to active-mode reminders/nudges pushed from the scheduler. */
    onNotify: (cb: (notice: ActiveModeNotice) => void): (() => void) => {
      const listener = (_e: unknown, notice: ActiveModeNotice) => cb(notice)
      ipcRenderer.on('activeMode:notify', listener)
      return () => ipcRenderer.removeListener('activeMode:notify', listener)
    },
    /** Subscribe to soft-friction prompts triggered by foreground detection. */
    onFriction: (cb: (data: FrictionTrigger) => void): (() => void) => {
      const listener = (_e: unknown, data: FrictionTrigger) => cb(data)
      ipcRenderer.on('activeMode:friction', listener)
      return () => ipcRenderer.removeListener('activeMode:friction', listener)
    }
  }
}

export interface ActiveModeNotice {
  kind: 'awareness' | 'nudge'
  title: string
  body: string
  id: string
}

export interface FrictionTrigger {
  appName: string
  questTitle: string | null
  id: string
  /** 'soft' = tier-3 are-you-sure prompt; 'block' = tier-4 block screen. */
  kind: 'soft' | 'block'
  /** Length of the tier-4 break pass, minutes (shown on the block screen). */
  breakMinutes: number
}

export interface BackupResult {
  ok: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export type QuestDayApi = typeof api

contextBridge.exposeInMainWorld('questday', api)
