// ---------------------------------------------------------------------------
// QuestDay — progress stats. Pure aggregations over the existing data (nothing
// new is tracked). Tone rule: these only ever celebrate — totals and wins, no
// shame metrics (no "days missed", no dropped-quest counts).
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import { isRecurring } from './recurrence'
import { ymd } from './rollover'
import type { PlayerState, Quest, TimeFrame } from '../types'

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
  return Number.isNaN(t.getTime()) ? [] : [ymd(t)]
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
    // Step by local CALENDAR day (Date normalizes the day component), not a fixed
    // 24h, so a DST-shift day (23h/25h) isn't duplicated or skipped in the chart.
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = ymd(d)
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

/** The set of local YYYY-MM-DD keys for the trailing `days` calendar days. */
function recentDayKeys(days: number, now: Date): Set<string> {
  const keys = new Set<string>()
  for (let i = days - 1; i >= 0; i--) {
    // Step by local CALENDAR day so a DST-shift day isn't dropped/duplicated.
    keys.add(ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
  }
  return keys
}

/** Completions in the trailing `days` days, grouped by time frame (frame order). */
export function completionsByFrameRecent(
  quests: Quest[],
  frames: TimeFrame[],
  days: number,
  now: Date
): FrameCount[] {
  const window = recentDayKeys(days, now)
  return [...frames]
    .sort((a, b) => a.order - b.order)
    .map((frame) => ({
      frame,
      count: quests
        .filter((q) => q.timeFrameId === frame.id)
        .reduce((sum, q) => sum + completionDays(q).filter((k) => window.has(k)).length, 0)
    }))
}

/** A calm once-a-week recap. Celebration-only — totals, the best day, and the
 *  week's "power hour" (busiest frame) over the trailing 7 days. No targets, no
 *  misses. Pure derivation over existing data, so ↩ Restore stays exact. */
export interface WeeklyReview {
  /** Completions in the trailing 7 days. */
  total: number
  /** Distinct days (0..7) with at least one completion. */
  activeDays: number
  /** The single best day in the window (earliest on a tie); null when total is 0. */
  bestDay: DayCount | null
  /** The busiest time frame this week; null when nothing landed in a frame. */
  topFrame: FrameCount | null
  /** The 7 trailing day counts, oldest first (for an optional mini chart). */
  days: DayCount[]
}

export function weeklyReview(quests: Quest[], frames: TimeFrame[], now: Date): WeeklyReview {
  const days = completionsPerDay(quests, 7, now)
  const total = days.reduce((sum, d) => sum + d.count, 0)
  const activeDays = days.filter((d) => d.count > 0).length
  const bestDay = total === 0 ? null : days.reduce((best, d) => (d.count > best.count ? d : best), days[0])
  const byFrame = completionsByFrameRecent(quests, frames, 7, now)
  const topFrame = byFrame.reduce<FrameCount | null>(
    (top, f) => (f.count > 0 && f.count > (top?.count ?? 0) ? f : top),
    null
  )
  return { total, activeDays, bestDay, topFrame, days }
}
