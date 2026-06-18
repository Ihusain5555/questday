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

/** questXP = round(baseXP * (1 + importanceBonus)) — before any streak bonus. */
export function questXP(quest: Pick<Quest, 'timeEstimateMinutes' | 'difficulty' | 'importance'>): number {
  const importanceBonus = balance.importanceBonus[quest.importance]
  return Math.round(baseXP(quest) * (1 + importanceBonus))
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
  /** Surprise treasure bonus folded into xpGained (v1.13); 0 when none rolled. */
  bonusXp: number
  /** Total XP awarded = round(base × streakMult) + bonusXp. */
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
export function applyCompletion(
  quest: Quest,
  player: PlayerState,
  today: string,
  bonusXp = 0
): CompletionAward {
  const newStreak = nextStreak(player.lastCompletionDate, player.streakCount, today)
  const streakMultiplier = streakBonusMultiplier(newStreak)

  const baseQuestXP = questXP(quest)
  // The treasure bonus (rolled by the caller) is FOLDED INTO xpGained before the
  // level-up loop, so a bonus can trigger a level-up and — crucially — the single
  // stored xpGained reverses exactly on ↩ Restore. Clamp ≥ 0 (gains-only guard).
  const bonus = Math.max(0, Math.round(bonusXp))
  const xpGained = Math.round(baseQuestXP * streakMultiplier) + bonus
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
    bonusXp: bonus,
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

export interface CompletionBonus {
  xp: number
  kind: 'none' | 'small' | 'big' | 'jackpot'
}

/**
 * Roll the surprise "treasure" bonus for a completion (v1.13). Gains-only. `rng`
 * returns [0,1) — inject Math.random at the call site so this stays pure + testable.
 * Tier chances (balance.completionBonus) sum to < 1 on purpose: the remainder is "no
 * bonus", so the small/big/jackpot rolls feel like a real surprise. Jackpot ≈ the
 * quest's base XP again (a satisfying "double"), with a floor.
 */
export function rollCompletionBonus(baseXp: number, rng: () => number): CompletionBonus {
  const b = balance.completionBonus
  const r = rng()
  const randInt = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1))
  if (r < b.jackpotChance) {
    return { xp: Math.max(b.jackpotMin, Math.round(baseXp * b.jackpotMult)), kind: 'jackpot' }
  }
  if (r < b.jackpotChance + b.bigChance) return { xp: randInt(b.bigMin, b.bigMax), kind: 'big' }
  if (r < b.jackpotChance + b.bigChance + b.smallChance) {
    return { xp: randInt(b.smallMin, b.smallMax), kind: 'small' }
  }
  return { xp: 0, kind: 'none' }
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
