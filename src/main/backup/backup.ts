// ---------------------------------------------------------------------------
// QuestDay — quiet automatic local backups (§10). A crash should never cost a
// day. Snapshots are written (debounced) to <userData>/backups and rotated.
//
// The OPAQUE manual Export/Import (gzipped, non-human-readable) lands in
// Phase 6 and will live alongside this module.
// ---------------------------------------------------------------------------

import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'fs'
import type { Database } from '@shared/types'

const MAX_BACKUPS = 20
const DEBOUNCE_MS = 5000

let timer: NodeJS.Timeout | null = null
let pending: Database | null = null
let counter = 0

function backupsDir(): string {
  const dir = join(app.getPath('userData'), 'backups')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** Queue a debounced background snapshot. Cheap to call on every save. */
export function writeAutoBackup(db: Database): void {
  pending = db
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    const snapshot = pending
    pending = null
    if (snapshot) flush(snapshot)
  }, DEBOUNCE_MS)
}

/**
 * Write a snapshot RIGHT NOW (no debounce). Used before destructive actions
 * (data reset) so even "start fresh" is recoverable from backups/.
 */
export function writeImmediateBackup(db: Database): void {
  flush(db)
}

function flush(db: Database): void {
  try {
    const dir = backupsDir()
    // Date.now()/new Date() are fine in app runtime; counter guards same-ms collisions.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = join(dir, `backup-${stamp}-${counter++}.json`)
    writeFileSync(file, JSON.stringify(db), 'utf-8')
    rotate(dir)
  } catch (err) {
    console.error('[questday] auto-backup failed:', err)
  }
}

function rotate(dir: string): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
  for (const old of files.slice(MAX_BACKUPS)) {
    try {
      unlinkSync(join(dir, old.f))
    } catch {
      /* best effort */
    }
  }
}
