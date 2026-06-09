// ---------------------------------------------------------------------------
// QuestDay — daily rollover (§6). Pure + testable.
//
// At a new day:
//  - Unfinished, non-overdue quests simply CARRY OVER (stay active). We surface
//    an encouraging message — never a penalty.
//  - Quests whose due date has PASSED are pointless to silently roll, so they
//    are returned for a relevance prompt (keep / reschedule / drop).
// ---------------------------------------------------------------------------

import { isRecurring, readyToReset } from './recurrence'
import type { Database, Quest } from '../types'

/** Local YYYY-MM-DD for a Date. */
export function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isOverdue(quest: Quest, now: Date): boolean {
  if (!quest.dueAt) return false
  const due = Date.parse(quest.dueAt)
  return !Number.isNaN(due) && due < now.getTime()
}

export interface DayChange {
  /** True when this is the first day the app has ever run (no encouragement). */
  firstRun: boolean
  /** Active, non-overdue ONE-OFF quests carried into the new day. */
  carried: Quest[]
  /** Active, overdue one-off quests needing a keep/reschedule/drop decision. */
  needsReview: Quest[]
  /** Completed recurring quests whose day has passed — reset to a fresh chance
   *  (v1.5). Recurring quests are never "carried" or nagged: they just renew. */
  recurringReady: Quest[]
}

/**
 * Determine what a transition into `now`'s day implies. Returns null when the
 * day has already been processed (db.lastSeenDate === today), so callers can
 * run this freely on mount and on every clock tick.
 */
export function computeDayChange(db: Database, now: Date): DayChange | null {
  const today = ymd(now)
  if (db.lastSeenDate === today) return null

  const firstRun = db.lastSeenDate === null
  // Recurring quests live outside carry-over/review — they renew, never nag.
  const active = db.quests.filter((q) => q.status === 'active' && !isRecurring(q))
  const needsReview = active.filter((q) => isOverdue(q, now))
  const carried = active.filter((q) => !isOverdue(q, now))
  const recurringReady = db.quests.filter((q) => readyToReset(q, now))
  return { firstRun, carried, needsReview, recurringReady }
}

/** A warm, varied, never-punitive carry-over message. */
export function encouragementMessage(count: number, now: Date): string {
  if (count <= 0) return ''
  const noun = count === 1 ? 'quest' : 'quests'
  const lines = [
    `Welcome back! ${count} ${noun} carried over to today — fresh start, you've got this. 💪`,
    `A new day, a clean slate. ${count} ${noun} are ready when you are. 🌅`,
    `Picking up where you left off: ${count} ${noun} carried over. No rush — one at a time. ✨`,
    `Yesterday's leftovers are today's wins-in-waiting: ${count} ${noun} carried over. 🌱`
  ]
  // Deterministic pick from the date so it's stable across re-renders that day.
  const idx = (now.getFullYear() + now.getMonth() + now.getDate()) % lines.length
  return lines[idx]
}
