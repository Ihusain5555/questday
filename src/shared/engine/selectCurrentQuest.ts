// ---------------------------------------------------------------------------
// QuestDay — "current quest" selection engine (§4). Pure + transparent.
//
// Precedence:
//   1. TIME FRAME is the primary gate: only active-frame, active-status quests
//      are candidates. Time frame trumps priority.
//   2. Among candidates, rank by a documented score balancing urgency,
//      priority, skippability, and time-to-complete. All weights live in
//      config/balance.ts.
//
// Skippability GATES urgency, which encodes the §4 worked example:
//   2pm, A due in 1h but "Nice to have", B High/"Must do" due Friday -> show B;
//   make A "Must do" and A wins because it is time-critical.
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

/** 0..1 time-pressure. Overdue = 1; undated = small baseline; ramps over the horizon. */
export function urgencyScore(quest: Quest, now: Date): number {
  if (!quest.dueAt) return balance.selection.undatedUrgency
  const dueMs = Date.parse(quest.dueAt)
  if (Number.isNaN(dueMs)) return balance.selection.undatedUrgency
  const hoursUntilDue = (dueMs - now.getTime()) / (60 * 60 * 1000)
  if (hoursUntilDue <= 0) return 1
  const horizon = balance.selection.urgencyHorizonHours
  return Math.max(0, Math.min(1, 1 - hoursUntilDue / horizon))
}

export interface QuestScore {
  quest: Quest
  score: number
  breakdown: {
    urgency: number
    effectiveUrgency: number
    priority: number
    quickWin: number
  }
}

/** Transparent score for a single quest (higher = more deserving of the spotlight). */
export function scoreQuest(quest: Quest, now: Date): QuestScore {
  const w = balance.selection.weights
  const urgency = urgencyScore(quest, now)
  const skip = balance.selection.skippabilityScore[quest.skippability]
  // Skippability gates urgency: a skippable soon-due quest yields.
  const effectiveUrgency = urgency * skip
  const priority = balance.selection.priorityScore[quest.priority]
  const quickWin = quest.timeEstimateMinutes <= balance.selection.quickWinThresholdMinutes ? 1 : 0

  const score =
    w.urgency * effectiveUrgency + w.priority * priority + w.quickWin * quickWin

  return { quest, score, breakdown: { urgency, effectiveUrgency, priority, quickWin } }
}

/** Candidates = active-status quests assigned to the active frame, ranked.
 *  Recurring quests on an off-day "rest": never candidates (v1.5). */
export function rankCandidates(quests: Quest[], timeFrames: TimeFrame[], now: Date): QuestScore[] {
  const frame = activeTimeFrame(timeFrames, now)
  if (!frame) return []
  return quests
    .filter((q) => q.status === 'active' && q.timeFrameId === frame.id && !isResting(q, now))
    .map((q) => scoreQuest(q, now))
    .sort((a, b) => b.score - a.score)
}

/** The single "current quest" to surface, or null when none qualifies. */
export function selectCurrentQuest(quests: Quest[], timeFrames: TimeFrame[], now: Date): Quest | null {
  return rankCandidates(quests, timeFrames, now)[0]?.quest ?? null
}

/** The immediate (first not-done, by order) sub-task of a quest. */
export function immediateSubTask(quest: Quest | null) {
  if (!quest) return null
  return [...quest.subTasks].sort((a, b) => a.order - b.order).find((s) => !s.done) ?? null
}
