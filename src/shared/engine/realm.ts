// ---------------------------------------------------------------------------
// QuestDay — the Realm map (logic layer). Pure: all-time completions -> which
// regions are revealed on the reward map. Tone rule: regions only ever GAIN —
// a charted region is charted forever. Reveal is DERIVED from the completion
// count (nothing persisted separately), so the one sanctioned correction
// (↩ Restore, which lowers the count by one) hides exactly the most-recent
// region — a correction, never a punishment.
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'

export type RealmRegion = (typeof balance.realm.atlases)[number]['regions'][number]

/** Every region across all atlases, in reveal order (lowest threshold first). */
export function allRegions(): RealmRegion[] {
  return balance.realm.atlases
    .flatMap((a) => a.regions)
    .slice()
    .sort((a, b) => a.at - b.at)
}

/** Ids of regions charted at this completion count. */
export function revealedRegionIds(completions: number): Set<string> {
  return new Set(allRegions().filter((r) => completions >= r.at).map((r) => r.id))
}

/**
 * Regions that cross from hidden -> charted as completions go prev -> now.
 * Used to announce a discovery in the completion celebration.
 */
export function newlyRevealed(prev: number, now: number): { id: string; name: string }[] {
  if (now <= prev) return []
  return allRegions()
    .filter((r) => r.at > prev && r.at <= now)
    .map((r) => ({ id: r.id, name: r.name }))
}

export interface RealmProgress {
  revealedCount: number
  total: number
  /** The next region to reveal (null once the whole atlas is charted). */
  next: RealmRegion | null
  /** Completions still needed for `next` (0 when fully charted). */
  toNext: number
  /** Percent of the realm charted (0–100). */
  percent: number
}

export function realmProgress(completions: number): RealmProgress {
  const regions = allRegions()
  const revealed = regions.filter((r) => completions >= r.at)
  const next = regions.find((r) => r.at > completions) ?? null
  return {
    revealedCount: revealed.length,
    total: regions.length,
    next,
    toNext: next ? Math.max(0, next.at - completions) : 0,
    percent: regions.length ? Math.round((revealed.length / regions.length) * 100) : 0
  }
}
