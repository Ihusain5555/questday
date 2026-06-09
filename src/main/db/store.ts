// ---------------------------------------------------------------------------
// QuestDay — persistence layer (§10). Local-only JSON store with ATOMIC writes
// (temp file + rename) so a crash mid-write can never corrupt the live file.
//
// This module is the ONLY place that touches the data file, so swapping the
// backing store (e.g. to SQLite) later is a contained change.
// ---------------------------------------------------------------------------

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, renameSync, writeFileSync, readFileSync } from 'fs'
import type { Database, DatabasePatch } from '@shared/types'
import { createDefaultDatabase, DB_VERSION } from '@shared/defaults'
import { writeAutoBackup } from '../backup/backup'

let cache: Database | null = null

/**
 * Main-process subscribers, notified on every persisted change (patch save AND
 * whole-db replace from Import). Lets index.ts mirror settings into OS state
 * (e.g. the launch-on-login registry entry) without a circular import.
 */
type ChangeListener = (db: Database) => void
const changeListeners: ChangeListener[] = []
export function onDatabaseChanged(cb: ChangeListener): void {
  changeListeners.push(cb)
}

/** Push the latest state to every renderer so all windows stay in sync. */
function broadcast(db: Database): void {
  for (const cb of changeListeners) cb(db)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('store:changed', db)
  }
}

export function dataDir(): string {
  return app.getPath('userData')
}
function dbPath(): string {
  return join(dataDir(), 'db.json')
}

function ensureDir(): void {
  const dir = dataDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/** Load from disk (or seed defaults). Tolerant of a missing/garbled file. */
export function loadDatabase(): Database {
  ensureDir()
  const path = dbPath()
  if (!existsSync(path)) {
    cache = createDefaultDatabase()
    persist(cache)
    return cache
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Database
    cache = migrate(parsed)
    return cache
  } catch (err) {
    // Never lose the user's day to a parse error: fall back to defaults but keep
    // the unreadable file aside for manual recovery.
    console.error('[questday] failed to read db.json, seeding defaults:', err)
    try {
      renameSync(path, path + `.corrupt`)
    } catch {
      /* best effort */
    }
    cache = createDefaultDatabase()
    persist(cache)
    return cache
  }
}

function migrate(db: Database): Database {
  // v1 is the first schema; future versions normalize here.
  if (typeof db.version !== 'number') db.version = DB_VERSION
  const fresh = createDefaultDatabase()
  return {
    version: DB_VERSION,
    quests: db.quests ?? fresh.quests,
    timeFrames: db.timeFrames ?? fresh.timeFrames,
    player: { ...fresh.player, ...db.player },
    garden: {
      ...fresh.garden,
      ...db.garden,
      // Pre-theme items belong to the original garden world.
      items: (db.garden?.items ?? []).map((i) => ({ ...i, theme: i.theme ?? 'garden' }))
    },
    arcade: { ...fresh.arcade, ...db.arcade },
    focus: { ...fresh.focus, ...db.focus },
    settings: {
      ...fresh.settings,
      ...db.settings,
      activeModeTiers: { ...fresh.settings.activeModeTiers, ...db.settings?.activeModeTiers },
      enabledFeatures: { ...fresh.settings.enabledFeatures, ...db.settings?.enabledFeatures }
    },
    lastSeenDate: db.lastSeenDate ?? fresh.lastSeenDate
  }
}

export function getDatabase(): Database {
  return cache ?? loadDatabase()
}

/** Atomic persist: write to a temp file then rename over the live file. */
function persist(db: Database): void {
  ensureDir()
  const path = dbPath()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8')
  renameSync(tmp, path)
}

/** Apply a shallow patch, persist atomically, and trigger a debounced backup. */
export function saveDatabase(patch: DatabasePatch): Database {
  const current = getDatabase()
  const next: Database = { ...current, ...patch, version: DB_VERSION }
  cache = next
  persist(next)
  writeAutoBackup(next)
  broadcast(next)
  return next
}

/** Replace the whole database (used by Import in Phase 6). */
export function replaceDatabase(db: Database): Database {
  cache = migrate(db)
  persist(cache)
  writeAutoBackup(cache)
  broadcast(cache)
  return cache
}
