// ---------------------------------------------------------------------------
// QuestDay — persistence layer (§10). Local-only JSON store with ATOMIC writes
// (temp file + rename) so a crash mid-write can never corrupt the live file.
//
// This module is the ONLY place that touches the data file, so swapping the
// backing store (e.g. to SQLite) later is a contained change.
// ---------------------------------------------------------------------------

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import {
  existsSync,
  mkdirSync,
  renameSync,
  readFileSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync
} from 'fs'
import type { Database, DatabasePatch, Importance, Quest, QuestTemplate, Urgency } from '@shared/types'
import { createDefaultDatabase, DB_VERSION } from '@shared/defaults'
import { writeAutoBackup } from '../backup/backup'

/** A stored quest that may still carry the pre-taxonomy `priority`/`skippability`
 *  fields (and may be missing the new `importance`/`urgency`). Lets migrate()
 *  read the old shape without `any` while emitting the current Quest shape. */
type LegacyQuest = Partial<Quest> & {
  priority?: string
  skippability?: string
  importance?: Importance
  urgency?: Urgency
}

/** Old skippability -> new importance; old priority -> new urgency. Idempotent:
 *  an existing importance/urgency is kept. The due date no longer feeds urgency. */
function migrateQuestTaxonomy(q: LegacyQuest): Quest {
  const { priority, skippability, ...rest } = q
  const importance: Importance =
    rest.importance ??
    (({ 'Must do': 'High', 'Should do': 'Medium', 'Nice to have': 'Low' } as Record<string, Importance>)[
      skippability ?? ''
    ] ??
      'Medium')
  const urgency: Urgency =
    rest.urgency ??
    (({ Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'High' } as Record<string, Urgency>)[
      priority ?? ''
    ] ??
      'Medium')
  return { ...rest, importance, urgency } as Quest
}

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
      // Timestamp the set-aside copy so a second corruption can't overwrite the
      // first (the first is the one most likely to hold recoverable data).
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      renameSync(path, `${path}.${stamp}.corrupt`)
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
    // Carry each quest into the current importance/urgency taxonomy, dropping the
    // old priority/skippability fields (idempotent — existing values are kept).
    quests: (db.quests ?? fresh.quests).map((q) => migrateQuestTaxonomy(q as LegacyQuest)),
    timeFrames: db.timeFrames ?? fresh.timeFrames,
    player: { ...fresh.player, ...db.player },
    garden: {
      ...fresh.garden,
      ...db.garden,
      // Pre-theme items belong to the original garden world.
      items: (db.garden?.items ?? []).map((i) => ({ ...i, theme: i.theme ?? 'garden' }))
    },
    arcade: { ...fresh.arcade, ...db.arcade },
    settings: {
      ...fresh.settings,
      ...db.settings,
      activeModeTiers: { ...fresh.settings.activeModeTiers, ...db.settings?.activeModeTiers },
      enabledFeatures: { ...fresh.settings.enabledFeatures, ...db.settings?.enabledFeatures }
    },
    // Town Editing override layer: tolerate old saves (missing) and corruption
    // (non-object / array) by failing safe to {}. A plain object is kept as-is —
    // per-town/per-override validation happens on the WRITE path (see validate()).
    townLayouts:
      db.townLayouts && typeof db.townLayouts === 'object' && !Array.isArray(db.townLayouts)
        ? db.townLayouts
        : fresh.townLayouts,
    // Quest Library: tolerate old saves (missing) and corruption (non-array) by
    // failing safe to []. Per-entry validation happens on the WRITE path (validate()).
    questTemplates: Array.isArray(db.questTemplates) ? db.questTemplates : fresh.questTemplates,
    // End-of-day reflections: tolerate old saves (missing) and corruption (non-object /
    // array) by failing safe to {}. Per-entry validation happens on the WRITE path.
    dailyNotes:
      db.dailyNotes && typeof db.dailyNotes === 'object' && !Array.isArray(db.dailyNotes)
        ? db.dailyNotes
        : fresh.dailyNotes,
    lastSeenDate: db.lastSeenDate ?? fresh.lastSeenDate
  }
}

export function getDatabase(): Database {
  return cache ?? loadDatabase()
}

/**
 * Atomic + durable persist: write the temp file, fsync it so the bytes actually
 * reach the disk, THEN rename over the live file. The rename alone is atomic (the
 * live file is never half-written), but without the fsync a crash/power-loss right
 * after the rename could leave the new file present-but-empty — the fsync closes
 * that window so a crash can never cost the user their latest change.
 */
function persist(db: Database): void {
  ensureDir()
  const path = dbPath()
  const tmp = path + '.tmp'
  const fd = openSync(tmp, 'w')
  try {
    writeSync(fd, JSON.stringify(db, null, 2), null, 'utf-8')
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  renameSync(tmp, path)
}

/**
 * Apply a patch onto the authoritative current state. Top-level keys replace
 * wholesale, but `settings` and `player` DEEP-MERGE so a writer that sends only
 * the fields it changed (e.g. the widget saving just its bounds) cannot clobber a
 * sibling field a different window wrote moments earlier (lost-update guard).
 */
function applyPatch(current: Database, patch: DatabasePatch): Database {
  // settings/player are deep-merged below; the rest replace wholesale. Pulling them
  // out keeps the base object fully-typed (a partial spread would widen it).
  const { settings: settingsPatch, player: playerPatch, ...rest } = patch
  const next: Database = { ...current, ...rest, version: DB_VERSION }
  if (settingsPatch) {
    next.settings = {
      ...current.settings,
      ...settingsPatch,
      // Nested maps within settings merge too (mirrors migrate()).
      activeModeTiers: { ...current.settings.activeModeTiers, ...settingsPatch.activeModeTiers },
      enabledFeatures: { ...current.settings.enabledFeatures, ...settingsPatch.enabledFeatures }
    }
  }
  if (playerPatch) {
    next.player = { ...current.player, ...playerPatch }
  }
  return next
}

/**
 * Structural invariants that MUST hold before anything is written. A renderer bug
 * that built a malformed patch (e.g. quests:undefined, player:null) must never be
 * able to persist corruption to db.json or broadcast it live to every window — so
 * we reject the save and leave the last-good state untouched. Returns a reason
 * string when invalid, or null when the state is safe to write.
 */
function validate(db: Database): string | null {
  if (!Array.isArray(db.quests)) return 'quests must be an array'
  if (!Array.isArray(db.timeFrames)) return 'timeFrames must be an array'
  // The new optional quest fields (v1.13) are display/selection-only and fail safe when
  // malformed, but reject a corrupt shape so the save stays structurally sound (mirrors
  // the per-entry checks for townLayouts/questTemplates/dailyNotes).
  for (const q of db.quests as unknown[]) {
    const quest = q as { snoozedUntil?: unknown; notes?: unknown } | null
    if (quest && typeof quest === 'object') {
      if (quest.snoozedUntil != null && typeof quest.snoozedUntil !== 'string')
        return 'quest snoozedUntil must be a string or null'
      if (quest.notes != null && typeof quest.notes !== 'string') return 'quest notes must be a string'
    }
  }
  if (!db.player || typeof db.player !== 'object') return 'player must be an object'
  if (!db.settings || typeof db.settings !== 'object') return 'settings must be an object'
  // townLayouts is optional-shaped on disk; if present it must be an object map
  // of { overrides: object }. Reject anything malformed so a renderer bug can't
  // persist a corrupt arrangement (the engine never reads it, but the save must
  // stay structurally sound). Checked as `unknown` — runtime data may defy types.
  const layouts = db.townLayouts as unknown
  if (layouts != null) {
    if (typeof layouts !== 'object' || Array.isArray(layouts)) {
      return 'townLayouts must be an object'
    }
    for (const [townId, layout] of Object.entries(layouts as Record<string, unknown>)) {
      const overrides = (layout as { overrides?: unknown } | null)?.overrides
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        return `townLayouts.${townId} must have an overrides object`
      }
    }
  }
  // questTemplates (Quest Library v1) is optional-shaped on disk; if present it must
  // be an array of blueprint objects carrying the required fields. Reject the whole
  // save on malformed data (don't silently drop entries) so a renderer bug can't
  // persist a corrupt library — the reward engine never reads it, but the save must
  // stay structurally sound. Checked as `unknown` — runtime data may defy types.
  const templates = db.questTemplates as unknown
  if (templates != null) {
    if (!Array.isArray(templates)) return 'questTemplates must be an array'
    for (const t of templates as unknown[]) {
      const tpl = t as Partial<QuestTemplate> | null
      if (!tpl || typeof tpl !== 'object') return 'questTemplates entries must be objects'
      if (typeof tpl.id !== 'string') return 'questTemplates entry needs a string id'
      if (typeof tpl.title !== 'string') return 'questTemplates entry needs a string title'
      if (!Array.isArray(tpl.subTasks)) return 'questTemplates entry needs a subTasks array'
    }
  }
  // dailyNotes (End-of-day reflections) is optional-shaped on disk; if present it must be
  // an object map of date → string. Reject the whole save on malformed data so a renderer
  // bug can't persist corruption (the reward engine never reads it, but the save must stay
  // structurally sound). Checked as `unknown` — runtime data may defy types.
  const notes = db.dailyNotes as unknown
  if (notes != null) {
    if (typeof notes !== 'object' || Array.isArray(notes)) return 'dailyNotes must be an object'
    for (const [day, text] of Object.entries(notes as Record<string, unknown>)) {
      if (typeof text !== 'string') return `dailyNotes.${day} must be a string`
    }
  }
  return null
}

/**
 * Apply a patch, persist atomically, and trigger a debounced backup.
 * Ordering is deliberate (data-safety): validate → write to disk → only THEN
 * advance the in-memory cache. If the disk write fails (a transient Windows file
 * lock from AV/OneDrive is common — this very project lives under OneDrive), the
 * cache is left unchanged so memory and disk never diverge, and the error is
 * surfaced to the caller instead of silently dropping a change.
 */
export function saveDatabase(patch: DatabasePatch): Database {
  const current = getDatabase()
  const next = applyPatch(current, patch)

  const invalid = validate(next)
  if (invalid) {
    console.error('[questday] rejected invalid save patch:', invalid)
    throw new Error(`Invalid save patch: ${invalid}`)
  }

  try {
    persist(next)
  } catch (err) {
    console.error('[questday] failed to write db.json (state left unchanged):', err)
    throw new Error('Could not save to disk')
  }

  cache = next
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
