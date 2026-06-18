// ---------------------------------------------------------------------------
// QuestDay — "current quest" selection engine (§4). Pure + transparent.
//
// Precedence:
//   1. TIME FRAME is the primary gate: only active-frame, active-status quests
//      are candidates. Time frame trumps importance/urgency.
//   2. Among candidates, rank by a documented score balancing the hand-set
//      importance and urgency levels plus a small quick-win nudge. All weights
//      live in config/balance.ts.
//
// Importance and urgency are now hand-set Low/Medium/High levels (the due date
// only schedules — it no longer feeds urgency).
//
// Wired into the widget in Phase 2. Implemented now as documented bones.
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import { isResting } from './recurrence'
import type { Quest, TimeFrame } from '../types'

export function minuteOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

/** True if `minute` falls inside the frame, handling midnight-wrapping frames. */
export function isFrameActive(frame: TimeFrame, minute: number): boolean {
  if (frame.startMinute <= frame.endMinute) {
    return minute >= frame.startMinute && minute < frame.endMinute
  }
  // Wraps past midnight (e.g. 21:00 -> 05:00).
  return minute >= frame.startMinute || minute < frame.endMinute
}

/** The currently active time frame, or null if none covers `now`. */
export function activeTimeFrame(timeFrames: TimeFrame[], now: Date): TimeFrame | null {
  const minute = minuteOfDay(now)
  const matches = timeFrames
    .filter((f) => isFrameActive(f, minute))
    .sort((a, b) => a.order - b.order)
  return matches[0] ?? null
}

export interface QuestScore {
  quest: Quest
  score: number
  breakdown: {
    importance: number
    urgency: number
    quickWin: number
    dueSoon: number
  }
}

/** Transparent score for a single quest (higher = more deserving of the spotlight).
 *  Importance and urgency are read straight from the quest's hand-set levels; a dated
 *  quest also gets a small, bounded due-soon nudge as its due time nears. */
export function scoreQuest(quest: Quest, now?: Date): QuestScore {
  const w = balance.selection.weights
  const imp = balance.selection.importanceScore[quest.importance]
  const urg = balance.selection.urgencyScore[quest.urgency]
  const quickWin = quest.timeEstimateMinutes <= balance.selection.quickWinThresholdMinutes ? 1 : 0

  // Deadline pull (v1.13): a 0→1 ramp that makes a dated quest rise as its due time
  // arrives. SHAPE (so it's deadline-aware WITHOUT inverting importance hours early):
  //   • approaching  — eased rise: ((within − hoursUntil) / within) ^ risePower, so it
  //     stays ~0 until the deadline is imminent, reaching 1 exactly at the due time.
  //   • overdue      — decays from 1 back to 0 across `dueSoonOverdueHours`, so a stale
  //     dated quest (e.g. a recurring quest with a frozen past dueAt) can't dominate
  //     forever — it falls back to its importance rank.
  // Weighted (balance.selection.weights.dueSoon) so a quest crosses importance levels
  // only right at its deadline. Off when undated, or when `now` isn't supplied (keeps
  // scoreQuest usable by non-time-aware callers, e.g. tests).
  let dueSoon = 0
  if (now && quest.dueAt) {
    const due = Date.parse(quest.dueAt)
    if (!Number.isNaN(due)) {
      const within = balance.selection.dueSoonWithinHours
      const overdueHours = balance.selection.dueSoonOverdueHours
      const risePower = balance.selection.dueSoonRisePower
      const hoursUntil = (due - now.getTime()) / 3_600_000
      if (hoursUntil >= 0) {
        if (hoursUntil < within) dueSoon = Math.pow((within - hoursUntil) / within, risePower)
      } else {
        dueSoon = Math.max(0, 1 - -hoursUntil / overdueHours)
      }
    }
  }

  const score = w.importance * imp + w.urgency * urg + w.quickWin * quickWin + w.dueSoon * dueSoon

  return { quest, score, breakdown: { importance: imp, urgency: urg, quickWin, dueSoon } }
}

/** True while a quest is snoozed (tucked away until `snoozedUntil`). Non-punitive —
 *  the quest is merely hidden from the spotlight until then, never penalized (v1.13). */
export function isSnoozed(quest: Quest, now: Date): boolean {
  return quest.snoozedUntil != null && Date.parse(quest.snoozedUntil) > now.getTime()
}

/** Candidates = active-status quests assigned to the active frame, ranked.
 *  Recurring quests on an off-day "rest": never candidates (v1.5). Snoozed quests are
 *  hidden from the spotlight until their snooze lifts (v1.13). */
export function rankCandidates(quests: Quest[], timeFrames: TimeFrame[], now: Date): QuestScore[] {
  const frame = activeTimeFrame(timeFrames, now)
  if (!frame) return []
  return quests
    .filter(
      (q) =>
        q.status === 'active' &&
        q.timeFrameId === frame.id &&
        !isResting(q, now) &&
        !isSnoozed(q, now)
    )
    .map((q) => scoreQuest(q, now))
    .sort((a, b) => b.score - a.score)
}

/** The single "current quest" to surface, or null when none qualifies. */
export function selectCurrentQuest(quests: Quest[], timeFrames: TimeFrame[], now: Date): Quest | null {
  return rankCandidates(quests, timeFrames, now)[0]?.quest ?? null
}

/** The current quest, honoring a user "pin" (widget click-to-switch, v1.13) when the
 *  pinned quest is still a valid candidate in the active frame; otherwise the scored
 *  pick. Because the pin is only honored among rankCandidates (already gated by frame +
 *  active + not resting/snoozed), a stale or out-of-frame pin simply falls back to the
 *  scorer — "pin overrides WITHIN the active frame". Pure: never mutates the pin. */
export function resolveCurrentQuest(
  quests: Quest[],
  timeFrames: TimeFrame[],
  now: Date,
  pinnedQuestId?: string | null
): Quest | null {
  const ranked = rankCandidates(quests, timeFrames, now)
  if (pinnedQuestId) {
    const pinned = ranked.find((r) => r.quest.id === pinnedQuestId)
    if (pinned) return pinned.quest
  }
  return ranked[0]?.quest ?? null
}

/** The immediate (first not-done, by order) sub-task of a quest. */
export function immediateSubTask(quest: Quest | null) {
  if (!quest) return null
  return [...quest.subTasks].sort((a, b) => a.order - b.order).find((s) => !s.done) ?? null
}
