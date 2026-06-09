// QuestDay — IPC for active-mode controls.

import { ipcMain } from 'electron'
import { getDatabase } from '../db/store'
import { snooze, testReminder, handleForeground } from '../activeMode/scheduler'

export function registerActiveModeIpc(): void {
  ipcMain.handle('activeMode:test', () => testReminder())
  ipcMain.handle('activeMode:snooze', () => {
    snooze(getDatabase().settings.nudgeSnoozeMin)
  })
  // Test/debug hook: inject a foreground sample as if the detector saw it.
  ipcMain.handle('activeMode:simulateForeground', (_e, app: string, title: string) =>
    handleForeground(app, title)
  )
}
