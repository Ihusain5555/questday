// ---------------------------------------------------------------------------
// Eisenhower decision matrix (prioritization layer). PURE + testable: it
// classifies ACTIVE quests into the urgent×important 2×2 using fields QuestDay
// ALREADY stores — `dueAt` (urgency) and `skippability`/`priority` (importance).
// It is read-only triage: it surfaces WHY the §4 current-quest engine leans the
// way it does, without adding a parallel data model. All knobs live in
// `balance.eisenhower`. Tone rule: the low/low quadrant is "Later", never
// "Delete" — QuestDay never shames a task into the trash.
// ---------------------------------------------------------------------------

import type { Quest } from '../types'
import { balance } from '../config/balance'

export type Quadrant = 'do' | 'schedule' | 'minimize' | 'later'

/** Urgent = due within the horizon, or already overdue. Undated = not urgent. */
export function isUrgent(quest: Pick<Quest, 'dueAt'>, now: Date): boolean {
  if (!quest.dueAt) return false
  const hoursLeft = (Date.parse(quest.dueAt) - now.getTime()) / 3_600_000
  return hoursLeft <= balance.eisenhower.urgentWithinHours
}

/** Important = a skippability or priority level the user flagged as mattering. */
export function isImportant(quest: Pick<Quest, 'skippability' | 'priority'>): boolean {
  const e = balance.eisenhower
  return (
    (e.importantSkippability as readonly string[]).includes(quest.skippability) ||
    (e.importantPriority as readonly string[]).includes(quest.priority)
  )
}

export function quadrantOf(quest: Quest, now: Date): Quadrant {
  const u = isUrgent(quest, now)
  const i = isImportant(quest)
  if (u && i) return 'do'
  if (!u && i) return 'schedule'
  if (u && !i) return 'minimize'
  return 'later'
}

/** Group ACTIVE quests into the four quadrants (completed/dropped excluded). */
export function classifyQuests(quests: Quest[], now: Date): Record<Quadrant, Quest[]> {
  const out: Record<Quadrant, Quest[]> = { do: [], schedule: [], minimize: [], later: [] }
  for (const q of quests) {
    if (q.status !== 'active') continue
    out[quadrantOf(q, now)].push(q)
  }
  return out
}
