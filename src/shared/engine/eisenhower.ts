// ---------------------------------------------------------------------------
// Eisenhower decision matrix (prioritization layer). PURE + testable: it
// classifies ACTIVE quests into the urgent×important 2×2 straight from the two
// hand-set quest fields — `importance` (y-axis) and `urgency` (x-axis). The due
// date no longer feeds urgency (it's scheduling only). It is read-only triage:
// it surfaces WHY the §4 current-quest engine leans the way it does, without
// adding a parallel data model. All knobs live in `balance.eisenhower`. Tone
// rule: the low/low quadrant is "Later", never "Delete" — QuestDay never shames
// a task into the trash.
// ---------------------------------------------------------------------------

import type { Quest } from '../types'
import { balance } from '../config/balance'

export type Quadrant = 'do' | 'schedule' | 'minimize' | 'later'

/** Urgent = a hand-set urgency level flagged as time-pressing. */
export function isUrgent(quest: Pick<Quest, 'urgency'>): boolean {
  return (balance.eisenhower.urgentLevels as readonly string[]).includes(quest.urgency)
}

/** Important = a hand-set importance level the user flagged as mattering. */
export function isImportant(quest: Pick<Quest, 'importance'>): boolean {
  return (balance.eisenhower.importantLevels as readonly string[]).includes(quest.importance)
}

export function quadrantOf(quest: Quest): Quadrant {
  const u = isUrgent(quest)
  const i = isImportant(quest)
  if (u && i) return 'do'
  if (!u && i) return 'schedule'
  if (u && !i) return 'minimize'
  return 'later'
}

/** Group ACTIVE quests into the four quadrants (completed/dropped excluded). */
export function classifyQuests(quests: Quest[]): Record<Quadrant, Quest[]> {
  const out: Record<Quadrant, Quest[]> = { do: [], schedule: [], minimize: [], later: [] }
  for (const q of quests) {
    if (q.status !== 'active') continue
    out[quadrantOf(q)].push(q)
  }
  return out
}
