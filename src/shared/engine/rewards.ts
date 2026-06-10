// ---------------------------------------------------------------------------
// QuestDay — reward economy (§7). Pure functions; all numbers come from
// config/balance.ts so they can be re-tuned in one place.
//
// Wired into the UI in Phase 3. Implemented now as documented, testable bones.
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import type { PlayerState, Quest } from '../types'

/** baseXP = round(timeEstimateMinutes / 5) * difficultyMultiplier */
export function baseXP(quest: Pick<Quest, 'timeEstimateMinutes' | 'difficulty'>): number {
  const diffMult = balance.difficultyMultiplier[quest.difficulty]
  return Math.round(quest.timeEstimateMinutes / balance.xpPerMinuteDivisor) * diffMult
}

/** questXP = round(baseXP * (1 + priorityBonus)) — before any streak bonus. */
export function questXP(quest: Pick<Quest, 'timeEstimateMinutes' | 'difficulty' | 'priority'>): number {
  const priorityBonus = balance.priorityBonus[quest.priority]
  return Math.round(baseXP(quest) * (1 + priorityBonus))
}

/** currency = round(questXP / 2), earned alongside XP. */
export function questCurrency(xp: number): number {
  return Math.round(xp / balance.currencyDivisor)
}

/** Rising XP cost to clear level n: 100 * n by default. */
export function xpForLevel(n: number): number {
  return balance.level.baseCost * n
}

/** Capped streak multiplier: +5%/day up to +25%. */
export function streakBonusMultiplier(streakCount: number): number {
  return 1 + Math.min(streakCount * balance.streak.bonusPerDay, balance.streak.maxBonus)
}

export interface CompletionAward {
  baseQuestXP: number
  streakMultiplier: number
  xpGained: number
  currencyGained: number
  newPlayer: PlayerState
  leveledUp: boolean
  newStreak: number
}

/**
 * Compute the reward for completing `quest` on `today` (YYYY-MM-DD), advancing
 * level and streak. Never removes XP/currency and never penalizes — a lapsed
 * streak simply resets to 1 for today's completion.
 */
export function applyCompletion(quest: Quest, player: PlayerState, today: string): CompletionAward {
  const newStreak = nextStreak(player.lastCompletionDate, player.streakCount, today)
  const streakMultiplier = streakBonusMultiplier(newStreak)

  const baseQuestXP = questXP(quest)
  const xpGained = Math.round(baseQuestXP * streakMultiplier)
  // Coins removed (v1.8.2): XP + the Realm are the rewards now. The currency
  // field is kept for save-compat but never earned, so it stays put.
  const currencyGained = 0

  let level = player.level
  let xp = player.xp + xpGained
  let leveledUp = false
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level += 1
    leveledUp = true
  }

  return {
    baseQuestXP,
    streakMultiplier,
    xpGained,
    currencyGained,
    leveledUp,
    newStreak,
    newPlayer: {
      // Spread first so fields beyond the §7 economy (e.g. arcade tickets)
      // survive a completion untouched.
      ...player,
      xp,
      level,
      currency: player.currency + currencyGained,
      streakCount: newStreak,
      lastCompletionDate: today
    }
  }
}

/** Consecutive-day streak. Same day = unchanged; +1 if yesterday; else reset to 1. */
export function nextStreak(
  lastCompletionDate: string | null,
  currentStreak: number,
  today: string
): number {
  if (!lastCompletionDate) return 1
  if (lastCompletionDate === today) return Math.max(currentStreak, 1)
  const last = Date.parse(lastCompletionDate + 'T00:00:00')
  const now = Date.parse(today + 'T00:00:00')
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.round((now - last) / dayMs)
  if (diffDays === 1) return currentStreak + 1
  return 1
}
