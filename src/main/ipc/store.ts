// QuestDay — typed IPC for the persistence layer. Channels are intentionally
// few in Phase 0 (load + patch); CRUD channels arrive in Phase 1.

import { ipcMain } from 'electron'
import type { DatabasePatch } from '@shared/types'
import { getDatabase, loadDatabase, saveDatabase } from '../db/store'

export function registerStoreIpc(): void {
  loadDatabase()

  ipcMain.handle('store:getState', () => getDatabase())

  ipcMain.handle('store:save', (_evt, patch: DatabasePatch) => saveDatabase(patch))
}
