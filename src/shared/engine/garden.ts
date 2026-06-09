// ---------------------------------------------------------------------------
// QuestDay — reward-world engine. Pure + transparent, numbers from
// config/balance.ts. The tone rule is structural here: every function returns
// a garden that is >= the input garden (more items, higher stages, more
// visitors). Nothing wilts, shrinks, or leaves — ever.
//
// Themed worlds (2026-06-06): each theme is its own plot — items carry their
// theme key, so switching themes is free and loses nothing. Coins are shared.
// Quest completions grow the ACTIVE world; the others simply wait.
// ---------------------------------------------------------------------------

import { balance } from '../config/balance'
import type { Garden, GardenItem } from '../types'

export type WorldTheme = (typeof balance.garden.themes)[number]
export type GardenSpecies = WorldTheme['catalog'][number]
export type GardenVisitor = WorldTheme['visitorMilestones'][number]
export type Season = (typeof balance.garden.seasons)[number]

/** Resolve a theme by key — unknown keys fall back to the first (garden). */
export function themeByKey(key: string): WorldTheme {
  return balance.garden.themes.find((t) => t.key === key) ?? balance.garden.themes[0]
}

export function activeTheme(garden: Garden): WorldTheme {
  return themeByKey(garden.theme)
}

/** Species lookup is per-theme (keys may repeat across themes). */
export function speciesByKey(themeKey: string, speciesKey: string): GardenSpecies | undefined {
  return themeByKey(themeKey).catalog.find((c) => c.key === speciesKey)
}

/** The active theme's items — what the plot shows and what completions grow. */
export function activeItems(garden: Garden): GardenItem[] {
  const theme = activeTheme(garden).key
  return garden.items.filter((i) => i.theme === theme)
}

/** The emoji an item currently shows (clamped so stale stages can't crash). */
export function itemEmoji(item: GardenItem): string {
  const species = speciesByKey(item.theme, item.species)
  if (!species) return '🌱'
  return species.stages[Math.min(item.stage, species.stages.length - 1)]
}

/** True when the plant has reached its final stage (decorations always are). */
export function isMature(item: GardenItem): boolean {
  const species = speciesByKey(item.theme, item.species)
  return !species || item.stage >= species.stages.length - 1
}

/**
 * Plot size in tiles: the base grows with level (config plotUpgrades), and is
 * additionally never smaller than what fits the items already placed in this
 * theme — so a level rollback from ↩ Restore can never strand an item.
 */
export function plotSize(level: number, items: GardenItem[]): { cols: number; rows: number } {
  // Widened from the literal config types — upgrades grow these.
  let cols: number = balance.garden.cols
  let rows: number = balance.garden.rows
  for (const u of balance.garden.plotUpgrades) {
    if (level >= u.level) {
      cols = Math.max(cols, u.cols)
      rows = Math.max(rows, u.rows)
    }
  }
  for (const i of items) {
    cols = Math.max(cols, i.x + 1)
    rows = Math.max(rows, i.y + 1)
  }
  return { cols, rows }
}

/** The next plot upgrade still ahead of this level (for the "grows at" hint). */
export function nextPlotUpgrade(level: number): (typeof balance.garden.plotUpgrades)[number] | undefined {
  return balance.garden.plotUpgrades.find((u) => u.level > level)
}

/** True if the tile is inside the active plot and not already occupied. */
export function canPlantAt(garden: Garden, level: number, x: number, y: number): boolean {
  const items = activeItems(garden)
  const { cols, rows } = plotSize(level, items)
  if (x < 0 || y < 0 || x >= cols || y >= rows) return false
  return !items.some((i) => i.x === x && i.y === y)
}

/** Place a bought item in the active world. Decorations are born mature. */
export function plantItem(
  garden: Garden,
  species: GardenSpecies,
  x: number,
  y: number,
  id: string,
  nowIso: string,
  level: number
): Garden {
  if (!canPlantAt(garden, level, x, y)) return garden
  const item: GardenItem = {
    id,
    theme: activeTheme(garden).key,
    species: species.key,
    x,
    y,
    stage: species.kind === 'decoration' ? species.stages.length - 1 : 0,
    plantedAt: nowIso
  }
  return { ...garden, items: [...garden.items, item] }
}

/**
 * Rearranging is free: move an item to any free tile of its plot. Purely
 * positional — stage, payout history, everything else is untouched.
 */
export function moveItem(garden: Garden, level: number, id: string, x: number, y: number): Garden {
  const item = garden.items.find((i) => i.id === id)
  if (!item) return garden
  const siblings = garden.items.filter((i) => i.theme === item.theme && i.id !== id)
  const { cols, rows } = plotSize(level, siblings.concat(item))
  if (x < 0 || y < 0 || x >= cols || y >= rows) return garden
  if (siblings.some((i) => i.x === x && i.y === y)) return garden
  return { ...garden, items: garden.items.map((i) => (i.id === id ? { ...i, x, y } : i)) }
}

export interface GrowthResult {
  garden: Garden
  /** The plant that advanced a stage (for celebration copy), if any. */
  grew: GardenItem | null
}

/**
 * A quest completion grows ONE plant a stage in the ACTIVE world: the
 * least-grown, oldest-planted first — so the plot fills in evenly and every
 * seed gets its turn. Other worlds aren't punished — they just pause.
 */
export function growOnCompletion(garden: Garden): GrowthResult {
  const growable = activeItems(garden)
    .filter((i) => !isMature(i))
    .sort((a, b) => a.stage - b.stage || a.plantedAt.localeCompare(b.plantedAt))
  const next = growable[0]
  if (!next) return { garden, grew: null }
  const grew = { ...next, stage: next.stage + 1 }
  return {
    garden: { ...garden, items: garden.items.map((i) => (i.id === next.id ? grew : i)) },
    grew
  }
}

/**
 * Visitors a theme shows = its milestones at or under the best streak ever.
 * Derived (not stored), so a milestone earned once shows its companion in
 * EVERY theme — and a lapsed streak never sends anyone away.
 */
export function earnedVisitors(theme: WorldTheme, bestStreak: number): GardenVisitor[] {
  return theme.visitorMilestones.filter((m) => m.streak <= bestStreak)
}

export interface VisitorResult {
  garden: Garden
  /** Visitors who just moved in (active theme's, for celebration copy). */
  arrived: GardenVisitor[]
}

/**
 * A NEW best streak can bring visitors. Milestones compare against the best
 * streak ever — a lapsed streak never sends anyone away (visitors are earned,
 * not rented).
 */
export function welcomeVisitors(garden: Garden, streakCount: number): VisitorResult {
  if (streakCount <= garden.bestStreak) return { garden, arrived: [] }
  const arrived = activeTheme(garden).visitorMilestones.filter(
    (m) => m.streak > garden.bestStreak && m.streak <= streakCount
  )
  return {
    garden: {
      ...garden,
      bestStreak: streakCount,
      // Keep the legacy earned-keys log appended (display derives from bestStreak).
      visitors: [...garden.visitors, ...arrived.map((m) => m.key).filter((k) => !garden.visitors.includes(k))]
    },
    arrived
  }
}

/** Cosmetic season for a date (config months). Purely visual — nothing wilts. */
export function seasonFor(date: Date): Season {
  const m = date.getMonth()
  return balance.garden.seasons.find((s) => (s.months as readonly number[]).includes(m)) ?? balance.garden.seasons[0]
}

// ---------------------------------------------------------------------------
// Harvest economy (v1.3, Grow-a-Garden inspired): daily weather, positive-only
// mutations that multiply harvests, multi-harvest crops, daily shop rotation.
// Randomness is always passed IN (rand: 0..1) so everything stays pure.
// ---------------------------------------------------------------------------

export type Weather = (typeof balance.garden.weather.kinds)[number]
export type Mutation = (typeof balance.garden.mutations.kinds)[number]
export type Rarity = keyof typeof balance.garden.rarities

/** Local YYYY-MM-DD (shared shape with rollover's ymd). */
function ymdLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Tiny deterministic string hash (FNV-ish) for date-seeded picks. */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Weighted deterministic pick: `roll` in [0,1). */
function weightedPick<T>(entries: readonly T[], weightOf: (t: T) => number, roll: number): T {
  const total = entries.reduce((s, e) => s + weightOf(e), 0)
  let acc = 0
  for (const e of entries) {
    acc += weightOf(e)
    if (roll * total < acc) return e
  }
  return entries[entries.length - 1]
}

/** Today's weather — date-seeded from the season's odds, stable all day. */
export function weatherFor(date: Date): Weather {
  const season = seasonFor(date)
  const weights = balance.garden.weather.weights[season.key as keyof typeof balance.garden.weather.weights]
  const roll = (hashStr(`weather:${ymdLocal(date)}`) % 1000) / 1000
  return weightedPick(
    balance.garden.weather.kinds,
    (k) => weights[k.key as keyof typeof weights] ?? 0,
    roll
  )
}

export function mutationByKey(key: string): Mutation | undefined {
  return balance.garden.mutations.kinds.find((m) => m.key === key)
}

/** Mutations that can roll under this weather ('any' always can). */
export function eligibleMutations(weatherKey: string): Mutation[] {
  return balance.garden.mutations.kinds.filter(
    (m) => (m.weather as readonly string[]).includes('any') || (m.weather as readonly string[]).includes(weatherKey)
  )
}

/**
 * Chance a growth event rolls a mutation: base + streak bonus (consistency =
 * luck) + the 3-day companion's perk. Only ever a bonus.
 */
export function mutationChance(streakCount: number, bestStreak: number): number {
  const m = balance.garden.mutations
  const streakBonus = Math.min(streakCount * m.chancePerStreakDay, m.maxStreakChanceBonus)
  const perk = bestStreak >= 3 ? balance.garden.harvest.perks.mutationChanceAt3 : 0
  return m.baseChance + streakBonus + perk
}

/**
 * Roll a mutation for a plant that just grew. `randHit`/`randPick` in [0,1).
 * Returns the mutation to apply, or null (no penalty — just no bonus).
 */
export function rollMutation(
  item: GardenItem,
  weatherKey: string,
  chance: number,
  randHit: number,
  randPick: number
): Mutation | null {
  const existing = item.mutations ?? []
  if (existing.length >= balance.garden.mutations.maxPerPlant) return null
  if (randHit >= chance) return null
  const pool = eligibleMutations(weatherKey).filter((m) => !existing.includes(m.key))
  if (pool.length === 0) return null
  return weightedPick(pool, (m) => m.weight, randPick)
}

/** Attach a rolled mutation to an item (pure add — never replaces anything). */
export function applyMutation(garden: Garden, itemId: string, mutationKey: string): Garden {
  return {
    ...garden,
    items: garden.items.map((i) =>
      i.id === itemId ? { ...i, mutations: [...(i.mutations ?? []), mutationKey] } : i
    )
  }
}

/** Product of an item's mutation multipliers (1 when unmutated). */
export function harvestMultiplier(item: GardenItem): number {
  return (item.mutations ?? []).reduce((p, k) => p * (mutationByKey(k)?.mult ?? 1), 1)
}

/** A ripe crop: plant-kind, fully grown, with a harvest value. */
export function isHarvestable(item: GardenItem): boolean {
  const species = speciesByKey(item.theme, item.species)
  return !!species && species.kind === 'plant' && species.harvestValue > 0 && isMature(item)
}

/** Coins a harvest pays right now (mutations × the 7-day companion's bonus). */
export function harvestPayout(item: GardenItem, bestStreak: number): number {
  const species = speciesByKey(item.theme, item.species)
  if (!species) return 0
  const perk = bestStreak >= 7 ? 1 + balance.garden.harvest.perks.harvestBonusAt7 : 1
  return Math.round(species.harvestValue * harvestMultiplier(item) * perk)
}

/**
 * Pick a ripe crop: it pays out (caller credits the coins), its mutations are
 * consumed, and it drops back ONE stage to regrow — multi-harvest, always.
 * Nothing is ever removed (tone rule).
 */
export function harvestItem(garden: Garden, id: string): Garden {
  return {
    ...garden,
    items: garden.items.map((i) =>
      i.id === id
        ? { ...i, stage: Math.max(0, i.stage - 1), mutations: [], harvests: (i.harvests ?? 0) + 1 }
        : i
    )
  }
}

/**
 * Daily shop stock: common/uncommon species are always available; rarer ones
 * rotate — a date-seeded pick of `rareSlotsPerDay` per theme. Deterministic,
 * cycles fairly, and nothing is ever permanently missable.
 */
export function dailyStock(themeKey: string, dateStr: string): Set<string> {
  const theme = themeByKey(themeKey)
  const inStock = new Set<string>()
  const rotating: string[] = []
  for (const c of theme.catalog) {
    if (c.rarity === 'common' || c.rarity === 'uncommon') inStock.add(c.key)
    else rotating.push(c.key)
  }
  const slots = Math.min(balance.garden.shop.rareSlotsPerDay, rotating.length)
  for (let i = 0; i < slots; i++) {
    const pool = rotating.filter((k) => !inStock.has(k))
    inStock.add(pool[hashStr(`stock:${themeKey}:${dateStr}:${i}`) % pool.length])
  }
  return inStock
}
