// ---------------------------------------------------------------------------
// QuestDay — the Realm map (logic layer). The reward artifact is YOUR realm,
// charted YOUR way: each completed quest earns one "expedition," and you spend
// it by charting any region AND choosing what to learn — your expedition returns
// with a knowledge entry (the Chronicle). Tone rule: gains only — a charted
// region is charted forever, and the Chronicle is never trimmed except to mirror
// an exact ↩ Restore (the newest discovery drops). The user's discoveries live
// in settings.realmChronicle (records, oldest first).
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import type { ChronicleRecord } from '../types'

export type RealmRegion = (typeof balance.realm.atlases)[number]['regions'][number]

/** Every region across all atlases. */
export function allRegions(): RealmRegion[] {
  return balance.realm.atlases.flatMap((a) => a.regions)
}

/** The set of charted region ids (for fast membership checks in the view). */
export function chartedRegionIds(chronicle: ChronicleRecord[]): Set<string> {
  return new Set(chronicle.map((r) => r.region))
}

/** Expeditions earned but not yet spent (1 earned per completed quest). */
export function claimsAvailable(completions: number, chartedCount: number): number {
  return Math.max(0, completions - chartedCount)
}

/** Expeditions you can actually spend right now — banked claims, capped by the
 *  number of regions still unexplored (no point banking past a full realm). */
export function claimableNow(completions: number, chronicle: ChronicleRecord[]): number {
  const unclaimed = allRegions().length - chronicle.length
  return Math.max(0, Math.min(claimsAvailable(completions, chronicle.length), unclaimed))
}

/**
 * Trim Chronicle records that exceed earned completions (after ↩ Restore drops
 * the count). Newest discoveries fall first (slice keeps the oldest), so a
 * restore reverses the most recent charting exactly.
 */
export function normalizeChronicle(completions: number, chronicle: ChronicleRecord[]): ChronicleRecord[] {
  return chronicle.length <= completions
    ? chronicle
    : chronicle.slice(0, Math.max(0, completions))
}

export interface RealmProgress {
  revealedCount: number
  total: number
  remaining: number
  percent: number
}

export function realmProgress(chronicle: ChronicleRecord[]): RealmProgress {
  const ids = new Set<string>(allRegions().map((r) => r.id))
  const charted = chronicle.filter((r) => ids.has(r.region)).length
  const total = allRegions().length
  return {
    revealedCount: charted,
    total,
    remaining: Math.max(0, total - charted),
    percent: total ? Math.round((charted / total) * 100) : 0
  }
}
