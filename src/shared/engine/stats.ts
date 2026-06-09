// ---------------------------------------------------------------------------
// QuestDay — progress stats. Pure aggregations over the existing data (nothing
// new is tracked). Tone rule: these only ever celebrate — totals and wins, no
// shame metrics (no "days missed", no dropped-quest counts).
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import { isRecurring } from './recurrence'
import type { PlayerState, Quest, TimeFrame } from '../types'

/** Local YYYY-MM-DD for a Date (matches streak day-counting). */
function ymdLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Total XP ever earned: every level cleared so far plus progress into the
 * current one. (xpForLevel(n) = baseCost * n, so cleared levels sum to
 * baseCost * (level-1) * level / 2.) Restore's exact claw-back keeps this honest.
 */
export function totalXpEarned(player: PlayerState): number {
  return (balance.level.baseCost * (player.level - 1) * player.level) / 2 + player.xp
}

export interface DayCount {
  /** Local YYYY-MM-DD. */
  date: string
  /** Short weekday label, e.g. "Mo". */
  label: string
  count: number
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/**
 * Every completion a quest represents, as local YYYY-MM-DD dates. One-offs use
 * `completedAt`; recurring quests use their `completionDates` history (the
 * daily reset never erases a win — v1.5).
 */
export function completionDays(quest: Quest): string[] {
  if (isRecurring(quest)) return quest.completionDates ?? []
  if (quest.status !== 'completed' || !quest.completedAt) return []
  const t = new Date(quest.completedAt)
  return Number.isNaN(t.getTime()) ? [] : [ymdLocal(t)]
}

/** Total completions ever (recurring history included). */
export function totalCompletions(quests: Quest[]): number {
  return quests.reduce((sum, q) => sum + completionDays(q).length, 0)
}

/** Completions per local day over the trailing `days` days, oldest first. */
export function completionsPerDay(quests: Quest[], days: number, now: Date): DayCount[] {
  const counts = new Map<string, number>()
  for (const q of quests)
    for (const key of completionDays(q)) counts.set(key, (counts.get(key) ?? 0) + 1)
  const out: DayCount[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = ymdLocal(d)
    out.push({ date: key, label: DAY_LABELS[d.getDay()], count: counts.get(key) ?? 0 })
  }
  return out
}

export interface FrameCount {
  frame: TimeFrame
  count: number
}

/** All-time completions grouped by time frame (frame order preserved). */
export function completionsByFrame(quests: Quest[], frames: TimeFrame[]): FrameCount[] {
  return [...frames]
    .sort((a, b) => a.order - b.order)
    .map((frame) => ({
      frame,
      count: quests
        .filter((q) => q.timeFrameId === frame.id)
        .reduce((sum, q) => sum + completionDays(q).length, 0)
    }))
}
