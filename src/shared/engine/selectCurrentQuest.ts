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
  }
}

/** Transparent score for a single quest (higher = more deserving of the spotlight).
 *  Importance and urgency are read straight from the quest's hand-set levels. */
export function scoreQuest(quest: Quest): QuestScore {
  const w = balance.selection.weights
  const imp = balance.selection.importanceScore[quest.importance]
  const urg = balance.selection.urgencyScore[quest.urgency]
  const quickWin = quest.timeEstimateMinutes <= balance.selection.quickWinThresholdMinutes ? 1 : 0

  const score = w.importance * imp + w.urgency * urg + w.quickWin * quickWin

  return { quest, score, breakdown: { importance: imp, urgency: urg, quickWin } }
}

/** Candidates = active-status quests assigned to the active frame, ranked.
 *  Recurring quests on an off-day "rest": never candidates (v1.5). */
export function rankCandidates(quests: Quest[], timeFrames: TimeFrame[], now: Date): QuestScore[] {
  const frame = activeTimeFrame(timeFrames, now)
  if (!frame) return []
  return quests
    .filter((q) => q.status === 'active' && q.timeFrameId === frame.id && !isResting(q, now))
    .map((q) => scoreQuest(q))
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
