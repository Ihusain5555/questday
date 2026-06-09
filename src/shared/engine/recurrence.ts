// ---------------------------------------------------------------------------
// QuestDay — recurring quests (v1.5). Pure helpers, tone rule intact:
// a recurring quest RESETS each day (fresh chance, full payout again), rests
// quietly on its off-days, and its history is never erased by the reset.
// ---------------------------------------------------------------------------

import type { Quest } from '../types'

export function isRecurring(quest: Quest): boolean {
  return (quest.recurDays?.length ?? 0) > 0
}

/** True when the quest is scheduled to recur on `date`'s weekday. */
export function recursOn(quest: Quest, date: Date): boolean {
  return (quest.recurDays ?? []).includes(date.getDay())
}

/** A recurring quest on an off-day: visible but dimmed, never surfaced/nagged. */
export function isResting(quest: Quest, now: Date): boolean {
  return isRecurring(quest) && !recursOn(quest, now)
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Human label for the schedule: "Daily", "Weekdays", "Weekends", "Mon/Wed/Fri". */
export function recurLabel(quest: Quest): string {
  const days = [...new Set(quest.recurDays ?? [])].sort()
  if (days.length === 0) return ''
  if (days.length === 7) return 'Daily'
  if (days.join(',') === '1,2,3,4,5') return 'Weekdays'
  if (days.join(',') === '0,6') return 'Weekends'
  return days.map((d) => DAY_SHORT[d]).join('/')
}

/** Local YYYY-MM-DD (matches rollover/streak day-counting). */
export function ymdOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** True when a completed recurring quest's completion is from a PREVIOUS day —
 *  i.e. it is ready to reset into a fresh chance. */
export function readyToReset(quest: Quest, now: Date): boolean {
  if (!isRecurring(quest) || quest.status !== 'completed' || !quest.completedAt) return false
  const t = new Date(quest.completedAt)
  return !Number.isNaN(t.getTime()) && ymdOf(t) !== ymdOf(now)
}
