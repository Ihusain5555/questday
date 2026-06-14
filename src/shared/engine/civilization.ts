// ---------------------------------------------------------------------------
// QuestDay — the Civilization ("Your Realm") logic layer (v1.10, in progress).
// Completing quests GROWS a medieval-fantasy town through 7 stages (Camp ->
// Empire) and settles multiple towns on the Terra Questa world map. Tone rule:
// gains only — stage and town unlocks are a PURE FUNCTION of all-time
// completions, so they never regress; the one sanctioned correction (↩ Restore,
// which lowers the completion count) walks the world back exactly. Nothing here
// is persisted — mirrors engine/realm.ts.
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import { totalCompletions } from './stats'
import type { Quest, WorldStageKey } from '../types'

export type CivStage = (typeof balance.civilization.stages)[number]
export type CivTown = (typeof balance.civilization.towns)[number]

/**
 * The current world stage for an all-time completion count: the last stage
 * whose `at` threshold has been reached. Always returns a stage (Camp is at 0).
 */
export function worldStage(completions: number): { stage: CivStage; index: number } {
  const stages = balance.civilization.stages
  let index = 0
  for (let i = 0; i < stages.length; i++) {
    const at: number = stages[i].at
    if (completions >= at) index = i
  }
  return { stage: stages[index], index }
}

export interface CivProgress {
  stageKey: WorldStageKey
  stageName: string
  stageIndex: number
  /** The next stage to reach, or null at Empire (the top). */
  nextStageName: string | null
  /** Completions earned since entering the current stage. */
  into: number
  /** Completions the current stage spans (current -> next); 0 at the top. */
  span: number
  /** 0..100 progress toward the next stage (100 at the top). */
  percent: number
  /** Completions still needed to reach the next stage (0 at the top). */
  toNext: number
}

/** Stage + progress toward the next stage, from all-time completions. */
export function civProgress(completions: number): CivProgress {
  const stages = balance.civilization.stages
  const { stage, index } = worldStage(completions)
  const curAt: number = stage.at
  const next = stages[index + 1] ?? null
  if (!next) {
    return {
      stageKey: stage.key,
      stageName: stage.name,
      stageIndex: index,
      nextStageName: null,
      into: completions - curAt,
      span: 0,
      percent: 100,
      toNext: 0
    }
  }
  const nextAt: number = next.at
  const span = nextAt - curAt
  const into = completions - curAt
  return {
    stageKey: stage.key,
    stageName: stage.name,
    stageIndex: index,
    nextStageName: next.name,
    into,
    span,
    percent: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100,
    toNext: Math.max(0, nextAt - completions)
  }
}

export interface CivTownState {
  town: CivTown
  /** Settled (rendered as a real town): completions reached AND not a teaser land. */
  unlocked: boolean
  /** A locked land shown as a "coming soon" silhouette (no art yet). */
  comingSoon: boolean
  /** Completions still needed before this land settles (0 once unlocked). */
  toUnlock: number
}

/** Every town's unlock state for a completion count. */
export function townStates(completions: number): CivTownState[] {
  return balance.civilization.towns.map((town) => {
    const unlockAt: number = town.unlockAt
    const reached = completions >= unlockAt
    return {
      town,
      unlocked: reached && !town.comingSoon,
      comingSoon: town.comingSoon,
      toUnlock: Math.max(0, unlockAt - completions)
    }
  })
}

export interface CivSummary extends CivProgress {
  completions: number
  towns: CivTownState[]
  unlockedTownCount: number
}

/** One-call summary for the UI: stage + progress + town unlock states, derived
 *  purely from the quest list (all-time completions). */
export function civSummary(quests: Quest[]): CivSummary {
  const completions = totalCompletions(quests)
  const prog = civProgress(completions)
  const towns = townStates(completions)
  return {
    ...prog,
    completions,
    towns,
    unlockedTownCount: towns.filter((t) => t.unlocked).length
  }
}
