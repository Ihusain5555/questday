// ---------------------------------------------------------------------------
// QuestDay — portable Export / Import (§10).
//
// The export is a single OPAQUE file (not human-readable): gzip-compressed JSON,
// AES-256-GCM encrypted with a fixed app key + random IV, behind a magic header.
// It's for backup and transfer between PCs — not for the user to open and read.
// (The static key is obfuscation, not secrecy: it lives in the app.)
// ---------------------------------------------------------------------------

import { dialog, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import { gzipSync, gunzipSync } from 'zlib'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import type { Database } from '@shared/types'
import { getDatabase, replaceDatabase } from '../db/store'

const MAGIC = Buffer.from('QDAY1\n', 'utf8')
const KEY = createHash('sha256').update('questday-backup-v1-obfuscation-key').digest()

export function encodeBackup(db: Database): Buffer {
  const gz = gzipSync(Buffer.from(JSON.stringify(db), 'utf8'))
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([cipher.update(gz), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([MAGIC, iv, tag, ct])
}

export function decodeBackup(buf: Buffer): Database {
  if (buf.length < MAGIC.length + 28 || !buf.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('This is not a QuestDay backup file.')
  }
  let o = MAGIC.length
  const iv = buf.subarray(o, (o += 12))
  const tag = buf.subarray(o, (o += 16))
  const ct = buf.subarray(o)
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  const gz = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(gunzipSync(gz).toString('utf8')) as Database
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

export interface BackupResult {
  ok: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export async function exportBackup(): Promise<BackupResult> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const { canceled, filePath } = await dialog.showSaveDialog(win!, {
    title: 'Export QuestDay backup',
    defaultPath: `questday-backup-${stamp()}.questday`,
    filters: [{ name: 'QuestDay backup', extensions: ['questday'] }]
  })
  if (canceled || !filePath) return { ok: false, canceled: true }
  try {
    writeFileSync(filePath, encodeBackup(getDatabase()))
    return { ok: true, path: filePath }
  } catch (err) {
    return { ok: false, error: String((err as Error).message ?? err) }
  }
}

export async function importBackup(): Promise<BackupResult> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
    title: 'Import QuestDay backup',
    properties: ['openFile'],
    filters: [{ name: 'QuestDay backup', extensions: ['questday'] }]
  })
  if (canceled || filePaths.length === 0) return { ok: false, canceled: true }
  try {
    const db = decodeBackup(readFileSync(filePaths[0]))
    if (!db || !Array.isArray(db.quests) || !Array.isArray(db.timeFrames)) {
      throw new Error('Backup file is missing expected data.')
    }
    replaceDatabase(db)
    return { ok: true, path: filePaths[0] }
  } catch (err) {
    return { ok: false, error: String((err as Error).message ?? err) }
  }
}
