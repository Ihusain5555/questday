// ---------------------------------------------------------------------------
// QuestDay — core data model (§3 of the build spec)
// ---------------------------------------------------------------------------

export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'
/** How acceptable it is to miss a quest. Distinct from `priority` (see §3/§4). */
export type Skippability = 'Must do' | 'Should do' | 'Nice to have'
export type QuestStatus = 'active' | 'completed' | 'dropped' | 'rolled-over'

export interface SubTask {
  id: string
  title: string
  order: number
  done: boolean
  /** Optional per-step estimate, in minutes. */
  timeEstimateMinutes?: number
}

export interface Quest {
  id: string
  title: string
  subTasks: SubTask[]
  /** Required by the §7 XP formula (difficultyMultiplier). */
  difficulty: Difficulty
  priority: Priority
  skippability: Skippability
  timeEstimateMinutes: number
  /** ISO datetime string, or null when undated. */
  dueAt: string | null
  timeFrameId: string
  status: QuestStatus
  createdAt: string
  completedAt: string | null
  /** Exactly what completing this paid out (streak bonus included) — stored so
   *  Restore can take back precisely this, never a recomputed guess. */
  completionAward?: { xp: number; currency: number }
  sortOrder: number
  /** How many days this quest has been carried into a new day (display only, never a penalty). */
  rolledOverCount?: number
  /** Recurring (v1.5): weekdays this quest repeats on (0=Sun..6=Sat). Empty or
   *  missing = a normal one-off quest. A completed recurring quest resets to
   *  active on the next day; on weekdays not listed it "rests" (shown dimmed,
   *  never surfaced as the current quest, never nagged). */
  recurDays?: number[]
  /** Completion history (YYYY-MM-DD) for recurring quests — the daily reset
   *  never erases a win; Stats counts these. */
  completionDates?: string[]
}

export interface TimeFrame {
  id: string
  name: string
  /** Minutes from midnight, 0..1439. */
  startMinute: number
  /** Exclusive end minute. May be < startMinute to wrap past midnight (e.g. Night). */
  endMinute: number
  order: number
}

export interface PlayerState {
  xp: number
  level: number
  currency: number
  streakCount: number
  /** YYYY-MM-DD of the most recent day with >= 1 completion. */
  lastCompletionDate: string | null
  /** Arcade tickets (v1.4): earned by completions (capped/day), never expire. */
  arcadeTickets: number
}

// --- The Arcade (v1.4): ticket-gated minigames -------------------------------
// Non-punitive: tickets never expire, bests only ever celebrate, quitting a
// round still cashes out whatever was scored.

export interface ArcadeState {
  /** Personal best score per game key (celebration-only). */
  best: Record<string, number>
  /** Daily ticket-earn tracking (the tickets themselves never expire). */
  ticketsEarnedOn: string | null
  ticketsEarnedCount: number
}

// --- Focus timer (Pomodoro family): execution-layer productivity ------------
// Non-punitive: a completed focus session pays a SMALL, daily-capped coin bonus
// (mirrors the Arcade earn-cap). Abandoning a session costs nothing; breaks are
// part of the method. The timer runs transiently in the renderer (never a write
// per tick) — only this earn-cap counter and the chosen preset persist.

export interface FocusState {
  /** YYYY-MM-DD the session-reward cap last reset on. */
  sessionsRewardedOn: string | null
  /** Focus sessions that paid a coin bonus today (capped — never punitive). */
  sessionsRewardedCount: number
}

export type ActiveModeTier = 'awareness' | 'nudge' | 'softFriction' | 'hardBlock'

/** One discovery in the Realm Chronicle: the region charted, the topic the player
 *  chose to study, and the knowledge entry their expedition returned with. */
export interface ChronicleRecord {
  region: string
  topic: string
  entry: string
}

export interface Settings {
  activeModeEnabled: boolean
  activeModeTiers: Record<ActiveModeTier, boolean>
  /** User-flagged distracting apps/sites (used by soft-friction / hard-block tiers). */
  distractingApps: string[]
  /** Awareness tier: minutes between quiet "current quest" reminders. */
  reminderIntervalMin: number
  /** Nudge tier: how many minutes before a time frame ends to nudge. */
  frameEndingLeadMin: number
  /** How long a snoozed reminder/nudge stays quiet, in minutes. */
  nudgeSnoozeMin: number
  /** Hard-block tier: length of the guilt-free "take a break" pass, in minutes. */
  blockBreakPassMin: number
  widgetBounds: { x: number; y: number; width: number; height: number } | null
  widgetExpanded: boolean
  /** Start QuestDay at Windows sign-in (widget only; main window stays in the tray). */
  launchOnLogin: boolean
  /** Chosen focus-timer preset key (see balance.focus.presets). */
  focusPreset: string
  /**
   * Optional productivity features the user has switched on/off (mirrors
   * `activeModeTiers`). Keyed by feature id (e.g. 'focus'); a missing key means
   * ON (features default visible). Turning one off only hides its tab — data is
   * never lost. New features slot in as one more entry here.
   */
  enabledFeatures: Record<string, boolean>
  /**
   * Realm Chronicle: what each charted region's expedition brought back (region +
   * chosen topic + knowledge entry id), oldest first — one record per charted
   * region. Each completed quest earns one expedition; the user spends it by
   * charting a region and choosing what to learn. Gains-only; trimmed only to
   * mirror an exact ↩ Restore. Drives the charted map AND the Chronicle codex.
   */
  realmChronicle?: ChronicleRecord[]
  /** The topic the player chose last in the Realm — highlighted next time for
   *  quick repeat tapping (they can still pick any). */
  realmLastTopic?: string
}

// --- Reward world: the garden (§7 vision, built 2026-06-06) -----------------
// Tone rule encoded in the model: a garden only ever GAINS items/stages/visitors.
// There is no wilt, no decay, no removal-by-neglect.
// 2026-06-06 (later): themed worlds. Each theme keeps its OWN placed items
// (an item carries its theme key), so switching themes is free and loses
// nothing — the other worlds simply wait for you.

export interface GardenItem {
  id: string
  /** World theme this item belongs to (see config/balance.ts `garden.themes`). */
  theme: string
  /** Catalog key within the theme's catalog. */
  species: string
  /** Tile position on the plot grid. */
  x: number
  y: number
  /** Growth stage index into the species' stages; decorations are born mature. */
  stage: number
  plantedAt: string
  /** Positive-only mutation keys rolled on growth (balance `garden.mutations`).
   *  Multiply the next harvest payout; consumed when harvested. */
  mutations?: string[]
  /** Times this plant has been harvested (multi-harvest: it always regrows). */
  harvests?: number
}

export interface Garden {
  /** Active world theme key. Pre-theme databases migrate to 'garden'. */
  theme: string
  /** All placed items across every theme (filter by `item.theme` to render). */
  items: GardenItem[]
  /** Visitor keys earned at best-streak milestones. Visitors never leave.
   *  (Legacy/celebration log — display now derives from `bestStreak`, so every
   *  theme shows its own companions for milestones already earned.) */
  visitors: string[]
  /** Highest streak ever reached — milestones trigger on NEW bests only. */
  bestStreak: number
}

export interface Database {
  version: number
  quests: Quest[]
  timeFrames: TimeFrame[]
  player: PlayerState
  garden: Garden
  arcade: ArcadeState
  focus: FocusState
  settings: Settings
  /** Last local date (YYYY-MM-DD) the app processed a daily rollover. */
  lastSeenDate: string | null
}

/** A shallow patch applied to the persisted database. */
export type DatabasePatch = Partial<Database>
