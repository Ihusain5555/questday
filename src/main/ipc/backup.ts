// QuestDay — IPC for portable Export / Import + the start-fresh data reset.

import { ipcMain } from 'electron'
import { exportBackup, importBackup } from '../backup/portable'
import { writeImmediateBackup } from '../backup/backup'
import { getDatabase, replaceDatabase } from '../db/store'
import { createDefaultDatabase } from '@shared/defaults'

export function registerBackupIpc(): void {
  ipcMain.handle('backup:export', () => exportBackup())
  ipcMain.handle('backup:import', () => importBackup())
  // Start fresh: snapshot the old data FIRST (immediate, not debounced) so a
  // regretted reset is recoverable from backups/, then replace with defaults.
  ipcMain.handle('data:reset', () => {
    writeImmediateBackup(getDatabase())
    replaceDatabase(createDefaultDatabase())
  })
}
