// ---------------------------------------------------------------------------
// QuestDay — SINGLE SOURCE OF TRUTH for all tunable weights/curves.
//
// Everything here is deliberately gathered in one file so the XP economy and
// the "current quest" selection can be re-tuned without touching logic
// (§7 + §9 Definition-of-Done #9). Numbers below are the spec defaults — flagged
// for tuning, not final.
// ---------------------------------------------------------------------------

import type { Difficulty, Priority, Skippability } from '../types'

export const balance = {
  // --- §7 XP / currency economy -------------------------------------------
  /** difficultyMultiplier: Easy = 1.0, Medium = 1.5, Hard = 2.5 */
  difficultyMultiplier: { Easy: 1.0, Medium: 1.5, Hard: 2.5 } as Record<Difficulty, number>,

  /** baseXP = round(timeEstimateMinutes / 5) * difficultyMultiplier */
  xpPerMinuteDivisor: 5,

  /** priorityBonus: +10% (High), +20% (Critical); Low/Medium = 0. */
  priorityBonus: { Low: 0, Medium: 0, High: 0.1, Critical: 0.2 } as Record<Priority, number>,

  /** currency = round(questXP / 2) */
  currencyDivisor: 2,

  // --- Levels --------------------------------------------------------------
  /** xpForLevel(n) = baseCost * n  (rising cost per level). */
  level: { baseCost: 100 },

  // --- Streak (§7) ---------------------------------------------------------
  /** +5% per consecutive day, capped at +25%. Never punitive. */
  streak: { bonusPerDay: 0.05, maxBonus: 0.25 },

  // --- Reward world: the garden ---------------------------------------------
  // Costs, unlock levels, growth stages, themes, plot upgrades, seasons, and
  // visitor milestones all live here so the world economy can be re-tuned
  // without touching logic.
  garden: {
    /** Base plot size in tiles. */
    cols: 6,
    rows: 4,
    /**
     * The plot grows as you level up (highest matching entry wins). The engine
     * additionally never lets the plot shrink below what fits the items already
     * placed — a level rollback from ↩ Restore can't strand anything.
     */
    plotUpgrades: [
      { level: 5, cols: 7, rows: 4 },
      { level: 8, cols: 7, rows: 5 },
      { level: 12, cols: 8, rows: 5 },
      { level: 16, cols: 9, rows: 6 },
      { level: 20, cols: 10, rows: 6 }
    ],
    /** Cosmetic only — a seasonal tint + badge by calendar month. Nothing wilts. */
    seasons: [
      { key: 'spring', name: 'Spring', emoji: '🌸', months: [2, 3, 4] },
      { key: 'summer', name: 'Summer', emoji: '☀️', months: [5, 6, 7] },
      { key: 'autumn', name: 'Autumn', emoji: '🍂', months: [8, 9, 10] },
      { key: 'winter', name: 'Winter', emoji: '❄️', months: [11, 0, 1] }
    ],
    /** Rarity tiers (Grow-a-Garden style): shop color + rotation behavior. */
    rarities: {
      common: { name: 'Common', color: '#9aa3ad' },
      uncommon: { name: 'Uncommon', color: '#4cd9a0' },
      rare: { name: 'Rare', color: '#3b82f6' },
      legendary: { name: 'Legendary', color: '#a855f7' },
      mythic: { name: 'Mythic', color: '#f59e0b' }
    },
    /** Daily weather — date-seeded per season; decides which mutations can roll. */
    weather: {
      kinds: [
        { key: 'sunny', name: 'Sunny', emoji: '☀️' },
        { key: 'breezy', name: 'Breezy', emoji: '🍃' },
        { key: 'rain', name: 'Rain', emoji: '🌧️' },
        { key: 'storm', name: 'Storm', emoji: '⛈️' },
        { key: 'snow', name: 'Snow', emoji: '❄️' }
      ],
      /** Weighted odds per season key. */
      weights: {
        spring: { sunny: 30, breezy: 25, rain: 30, storm: 10, snow: 5 },
        summer: { sunny: 45, breezy: 20, rain: 15, storm: 20, snow: 0 },
        autumn: { sunny: 25, breezy: 35, rain: 25, storm: 10, snow: 5 },
        winter: { sunny: 20, breezy: 15, rain: 10, storm: 5, snow: 50 }
      }
    },
    /**
     * Mutations (the Grow-a-Garden jackpot): when a plant grows a stage, it can
     * roll a mutation that MULTIPLIES its next harvest. Positive-only — there is
     * no negative mutation, ever. Today's weather decides what can roll.
     */
    mutations: {
      /** Chance to roll on each growth event… */
      baseChance: 0.18,
      /** …raised by your streak (consistency = luck): */
      chancePerStreakDay: 0.01,
      maxStreakChanceBonus: 0.1,
      /** Max distinct mutations one plant can carry at once. */
      maxPerPlant: 3,
      kinds: [
        { key: 'dewy', name: 'Dewy', emoji: '💧', mult: 2, weather: ['rain', 'storm'], weight: 40 },
        { key: 'sunkissed', name: 'Sun-kissed', emoji: '🌞', mult: 4, weather: ['sunny'], weight: 40 },
        { key: 'windswept', name: 'Windswept', emoji: '🍃', mult: 3, weather: ['breezy'], weight: 40 },
        { key: 'frosty', name: 'Frosty', emoji: '❄️', mult: 3, weather: ['snow'], weight: 40 },
        { key: 'charged', name: 'Charged', emoji: '⚡', mult: 12, weather: ['storm'], weight: 12 },
        { key: 'golden', name: 'Golden', emoji: '✨', mult: 8, weather: ['any'], weight: 8 },
        { key: 'rainbow', name: 'Rainbow', emoji: '🌈', mult: 25, weather: ['any'], weight: 2 }
      ]
    },
    /**
     * Harvest economy: ripe crops can be picked for coins. ALL crops are
     * multi-harvest (tone rule: nothing is ever removed) — picking pays out,
     * consumes the mutations, and drops the plant back one stage to regrow.
     * Streak companions grant passive perks (earned at best-streak milestones,
     * never lost).
     */
    harvest: {
      perks: {
        /** ≥3-day best streak: extra mutation chance. */
        mutationChanceAt3: 0.05,
        /** ≥7-day best: bonus on every harvest payout. */
        harvestBonusAt7: 0.1,
        /** ≥14-day best: morning dew grows this many plants. */
        dewPlantsAt14: 2,
        /** ≥30-day best: chance a harvest pays double. */
        doubleChanceAt30: 0.1
      }
    },
    /** Shop rotation: common/uncommon always stocked; rarer seeds rotate daily. */
    shop: { rareSlotsPerDay: 3 },
    /** Morning dew: each new day one plant grows free — a gift, not a grind. */
    dew: { plants: 1 },
    /**
     * Selectable world themes — pick the style of game you like. Each theme has
     * its own plot, catalog, and streak companions; coins are shared. Within a
     * catalog: "plant"-kind entries advance one `stages` step per quest
     * completion (one per completion, oldest-least-grown first); decorations
     * are born at their final stage. Visitor milestones share the same streak
     * thresholds across themes, so a milestone earned once shows in every world.
     */
    themes: [
      {
        key: 'garden',
        name: 'Garden',
        emoji: '🌱',
        ground: 'garden',
        blurb: 'A quiet plot that blooms out of your effort.',
        catalog: [
          { key: 'daisy', name: 'Daisy', kind: 'plant', stages: ['🌱', '🌿', '🌼'], cost: 8, unlockLevel: 1, rarity: 'common', harvestValue: 5 },
          { key: 'tulip', name: 'Tulip', kind: 'plant', stages: ['🌱', '🌿', '🌷'], cost: 10, unlockLevel: 1, rarity: 'common', harvestValue: 6 },
          { key: 'sunflower', name: 'Sunflower', kind: 'plant', stages: ['🌱', '🌿', '🌻'], cost: 15, unlockLevel: 2, rarity: 'uncommon', harvestValue: 9 },
          { key: 'rose', name: 'Rose', kind: 'plant', stages: ['🌱', '🌿', '🌹'], cost: 20, unlockLevel: 3, rarity: 'uncommon', harvestValue: 12 },
          { key: 'cherry', name: 'Cherry tree', kind: 'plant', stages: ['🌱', '🪴', '🌸'], cost: 35, unlockLevel: 5, rarity: 'rare', harvestValue: 20 },
          { key: 'tree', name: 'Oak tree', kind: 'plant', stages: ['🌱', '🪴', '🌳'], cost: 40, unlockLevel: 4, rarity: 'rare', harvestValue: 24 },
          { key: 'hibiscus', name: 'Hibiscus', kind: 'plant', stages: ['🌱', '🌿', '🌺'], cost: 120, unlockLevel: 8, rarity: 'legendary', harvestValue: 70 },
          { key: 'lotus', name: 'Lotus', kind: 'plant', stages: ['🌱', '🌿', '🪷'], cost: 300, unlockLevel: 12, rarity: 'mythic', harvestValue: 170 },
          { key: 'rock', name: 'Mossy rock', kind: 'decoration', stages: ['🪨'], cost: 5, unlockLevel: 1, rarity: 'common', harvestValue: 0 },
          { key: 'bench', name: 'Garden bench', kind: 'decoration', stages: ['🪑'], cost: 25, unlockLevel: 2, rarity: 'uncommon', harvestValue: 0 },
          { key: 'lantern', name: 'Lantern', kind: 'decoration', stages: ['🏮'], cost: 30, unlockLevel: 3, rarity: 'rare', harvestValue: 0 },
          { key: 'fountain', name: 'Fountain', kind: 'decoration', stages: ['⛲'], cost: 80, unlockLevel: 6, rarity: 'legendary', harvestValue: 0 }
        ],
        visitorMilestones: [
          { streak: 3, key: 'butterfly', emoji: '🦋', name: 'Butterfly' },
          { streak: 7, key: 'songbird', emoji: '🐦', name: 'Songbird' },
          { streak: 14, key: 'squirrel', emoji: '🐿️', name: 'Squirrel' },
          { streak: 30, key: 'hedgehog', emoji: '🦔', name: 'Hedgehog' }
        ]
      },
      {
        key: 'medieval',
        name: 'Medieval kingdom',
        emoji: '🏰',
        ground: 'stone',
        blurb: 'Raise a kingdom, one quest at a time.',
        catalog: [
          { key: 'cottage', name: 'Cottage', kind: 'plant', stages: ['🪵', '🛖', '🏠'], cost: 8, unlockLevel: 1, rarity: 'common', harvestValue: 5 },
          { key: 'camp', name: 'Camp', kind: 'plant', stages: ['🔥', '⛺'], cost: 10, unlockLevel: 1, rarity: 'common', harvestValue: 6 },
          { key: 'watchtower', name: 'Watchtower', kind: 'plant', stages: ['🪨', '🧱', '🗼'], cost: 15, unlockLevel: 2, rarity: 'uncommon', harvestValue: 9 },
          { key: 'chapel', name: 'Chapel', kind: 'plant', stages: ['🪨', '🧱', '⛪'], cost: 20, unlockLevel: 3, rarity: 'uncommon', harvestValue: 12 },
          { key: 'tourney', name: 'Tourney grounds', kind: 'plant', stages: ['🪵', '🎪'], cost: 35, unlockLevel: 4, rarity: 'rare', harvestValue: 20 },
          { key: 'castle', name: 'Castle', kind: 'plant', stages: ['🪨', '🧱', '🏰'], cost: 40, unlockLevel: 5, rarity: 'rare', harvestValue: 24 },
          { key: 'citadel', name: 'Citadel', kind: 'plant', stages: ['🪨', '🧱', '🏯'], cost: 120, unlockLevel: 8, rarity: 'legendary', harvestValue: 70 },
          { key: 'dragonroost', name: 'Dragon roost', kind: 'plant', stages: ['🪨', '🔥', '🐲'], cost: 300, unlockLevel: 12, rarity: 'mythic', harvestValue: 170 },
          { key: 'shield', name: 'Shield', kind: 'decoration', stages: ['🛡️'], cost: 5, unlockLevel: 1, rarity: 'common', harvestValue: 0 },
          { key: 'swords', name: 'Crossed swords', kind: 'decoration', stages: ['⚔️'], cost: 25, unlockLevel: 2, rarity: 'uncommon', harvestValue: 0 },
          { key: 'throne', name: 'Throne', kind: 'decoration', stages: ['🪑'], cost: 30, unlockLevel: 3, rarity: 'rare', harvestValue: 0 },
          { key: 'crown', name: 'Crown monument', kind: 'decoration', stages: ['👑'], cost: 80, unlockLevel: 6, rarity: 'legendary', harvestValue: 0 }
        ],
        visitorMilestones: [
          { streak: 3, key: 'horse', emoji: '🐎', name: 'Horse' },
          { streak: 7, key: 'knight', emoji: '🤺', name: 'Knight' },
          { streak: 14, key: 'wizard', emoji: '🧙', name: 'Wizard' },
          { streak: 30, key: 'dragon', emoji: '🐉', name: 'Dragon' }
        ]
      },
      {
        key: 'farm',
        name: 'Farmstead',
        emoji: '🌾',
        ground: 'soil',
        blurb: 'Sow, tend, harvest — honest work pays off.',
        catalog: [
          { key: 'wheat', name: 'Wheat', kind: 'plant', stages: ['🌱', '🌾'], cost: 8, unlockLevel: 1, rarity: 'common', harvestValue: 5 },
          { key: 'carrot', name: 'Carrots', kind: 'plant', stages: ['🌱', '🥕'], cost: 10, unlockLevel: 1, rarity: 'common', harvestValue: 6 },
          { key: 'corn', name: 'Corn', kind: 'plant', stages: ['🌱', '🌿', '🌽'], cost: 15, unlockLevel: 2, rarity: 'uncommon', harvestValue: 9 },
          { key: 'pumpkin', name: 'Pumpkin', kind: 'plant', stages: ['🌱', '🌿', '🎃'], cost: 20, unlockLevel: 3, rarity: 'uncommon', harvestValue: 12 },
          { key: 'grapes', name: 'Grape vines', kind: 'plant', stages: ['🌱', '🌿', '🍇'], cost: 35, unlockLevel: 4, rarity: 'rare', harvestValue: 20 },
          { key: 'apple', name: 'Apple tree', kind: 'plant', stages: ['🌱', '🪴', '🍎'], cost: 40, unlockLevel: 5, rarity: 'rare', harvestValue: 24 },
          { key: 'melon', name: 'Watermelon', kind: 'plant', stages: ['🌱', '🌿', '🍉'], cost: 120, unlockLevel: 8, rarity: 'legendary', harvestValue: 70 },
          { key: 'pineapple', name: 'Golden pineapple', kind: 'plant', stages: ['🌱', '🌿', '🍍'], cost: 300, unlockLevel: 12, rarity: 'mythic', harvestValue: 170 },
          { key: 'trough', name: 'Water trough', kind: 'decoration', stages: ['🪣'], cost: 5, unlockLevel: 1, rarity: 'common', harvestValue: 0 },
          { key: 'barn', name: 'Barn', kind: 'decoration', stages: ['🛖'], cost: 25, unlockLevel: 2, rarity: 'uncommon', harvestValue: 0 },
          { key: 'tractor', name: 'Tractor', kind: 'decoration', stages: ['🚜'], cost: 30, unlockLevel: 3, rarity: 'rare', harvestValue: 0 },
          { key: 'farmhouse', name: 'Farmhouse', kind: 'decoration', stages: ['🏡'], cost: 80, unlockLevel: 6, rarity: 'legendary', harvestValue: 0 }
        ],
        visitorMilestones: [
          { streak: 3, key: 'hen', emoji: '🐔', name: 'Hen' },
          { streak: 7, key: 'sheep', emoji: '🐑', name: 'Sheep' },
          { streak: 14, key: 'cow', emoji: '🐄', name: 'Cow' },
          { streak: 30, key: 'farmhorse', emoji: '🐴', name: 'Horse' }
        ]
      },
      {
        key: 'city',
        name: 'Modern city',
        emoji: '🏙️',
        ground: 'concrete',
        blurb: 'Build your skyline, block by block.',
        catalog: [
          { key: 'house', name: 'House', kind: 'plant', stages: ['🚧', '🏠'], cost: 8, unlockLevel: 1, rarity: 'common', harvestValue: 5 },
          { key: 'shop', name: 'Corner shop', kind: 'plant', stages: ['🚧', '🏪'], cost: 10, unlockLevel: 1, rarity: 'common', harvestValue: 6 },
          { key: 'apartment', name: 'Apartments', kind: 'plant', stages: ['🚧', '🏗️', '🏢'], cost: 15, unlockLevel: 2, rarity: 'uncommon', harvestValue: 9 },
          { key: 'hotel', name: 'Hotel', kind: 'plant', stages: ['🚧', '🏗️', '🏨'], cost: 20, unlockLevel: 3, rarity: 'uncommon', harvestValue: 12 },
          { key: 'mall', name: 'Mall', kind: 'plant', stages: ['🚧', '🏗️', '🏬'], cost: 35, unlockLevel: 4, rarity: 'rare', harvestValue: 20 },
          { key: 'stadium', name: 'Stadium', kind: 'plant', stages: ['🚧', '🏗️', '🏟️'], cost: 40, unlockLevel: 5, rarity: 'rare', harvestValue: 24 },
          { key: 'skytower', name: 'Sky tower', kind: 'plant', stages: ['🚧', '🏗️', '🗼'], cost: 120, unlockLevel: 8, rarity: 'legendary', harvestValue: 70 },
          { key: 'skyline', name: 'Skyline block', kind: 'plant', stages: ['🚧', '🏗️', '🌆'], cost: 300, unlockLevel: 12, rarity: 'mythic', harvestValue: 170 },
          { key: 'busstop', name: 'Bus stop', kind: 'decoration', stages: ['🚏'], cost: 5, unlockLevel: 1, rarity: 'common', harvestValue: 0 },
          { key: 'park', name: 'Park tree', kind: 'decoration', stages: ['🌳'], cost: 25, unlockLevel: 2, rarity: 'uncommon', harvestValue: 0 },
          { key: 'fountain', name: 'Plaza fountain', kind: 'decoration', stages: ['⛲'], cost: 30, unlockLevel: 3, rarity: 'rare', harvestValue: 0 },
          { key: 'statue', name: 'Statue', kind: 'decoration', stages: ['🗽'], cost: 80, unlockLevel: 6, rarity: 'legendary', harvestValue: 0 }
        ],
        visitorMilestones: [
          { streak: 3, key: 'pigeon', emoji: '🐦', name: 'Pigeon' },
          { streak: 7, key: 'taxi', emoji: '🚕', name: 'Taxi line' },
          { streak: 14, key: 'busker', emoji: '🎷', name: 'Street musician' },
          { streak: 30, key: 'balloon', emoji: '🎈', name: 'Hot-air balloon' }
        ]
      },
      {
        key: 'space',
        name: 'Space outpost',
        emoji: '🚀',
        ground: 'lunar',
        blurb: 'A frontier colony, assembled mission by mission.',
        catalog: [
          { key: 'solar', name: 'Solar array', kind: 'plant', stages: ['🔩', '🔋'], cost: 8, unlockLevel: 1, rarity: 'common', harvestValue: 5 },
          { key: 'dome', name: 'Greenhouse dome', kind: 'plant', stages: ['🌱', '🌿', '🪴'], cost: 10, unlockLevel: 1, rarity: 'common', harvestValue: 6 },
          { key: 'antenna', name: 'Antenna', kind: 'plant', stages: ['🔩', '⚙️', '📡'], cost: 15, unlockLevel: 2, rarity: 'uncommon', harvestValue: 9 },
          { key: 'observatory', name: 'Observatory', kind: 'plant', stages: ['🔩', '⚙️', '🔭'], cost: 20, unlockLevel: 3, rarity: 'uncommon', harvestValue: 12 },
          { key: 'station', name: 'Space station', kind: 'plant', stages: ['🔩', '⚙️', '🛰️'], cost: 35, unlockLevel: 4, rarity: 'rare', harvestValue: 20 },
          { key: 'launchpad', name: 'Launch pad', kind: 'plant', stages: ['🔩', '🏗️', '🚀'], cost: 40, unlockLevel: 5, rarity: 'rare', harvestValue: 24 },
          { key: 'nebula', name: 'Nebula garden', kind: 'plant', stages: ['🔩', '🔭', '🌌'], cost: 120, unlockLevel: 8, rarity: 'legendary', harvestValue: 70 },
          { key: 'ringstation', name: 'Ring station', kind: 'plant', stages: ['🔩', '🛰️', '🪐'], cost: 300, unlockLevel: 12, rarity: 'mythic', harvestValue: 170 },
          { key: 'moonrock', name: 'Moon rock', kind: 'decoration', stages: ['🌑'], cost: 5, unlockLevel: 1, rarity: 'common', harvestValue: 0 },
          { key: 'robot', name: 'Robot helper', kind: 'decoration', stages: ['🤖'], cost: 25, unlockLevel: 2, rarity: 'uncommon', harvestValue: 0 },
          { key: 'flag', name: 'Mission flag', kind: 'decoration', stages: ['🚩'], cost: 30, unlockLevel: 3, rarity: 'rare', harvestValue: 0 },
          { key: 'crystal', name: 'Crystal spire', kind: 'decoration', stages: ['💎'], cost: 80, unlockLevel: 6, rarity: 'legendary', harvestValue: 0 }
        ],
        visitorMilestones: [
          { streak: 3, key: 'pixelpal', emoji: '👾', name: 'Pixel pal' },
          { streak: 7, key: 'ufo', emoji: '🛸', name: 'Friendly UFO' },
          { streak: 14, key: 'alien', emoji: '👽', name: 'Curious visitor' },
          { streak: 30, key: 'comet', emoji: '☄️', name: 'Comet' }
        ]
      }
    ]
  },

  // --- The Realm map (reward artifact) ---------------------------------------
  // The gains-only "fills-in" reward: a fantasy realm whose regions are
  // "discovered" as you complete quests. A region, once charted, is charted
  // FOREVER (tone rule) — reveal is a pure function of all-time completions
  // (see engine/realm.ts), so nothing here is persisted separately and the one
  // sanctioned correction (↩ Restore) hides the most recent region exactly.
  // `at` = completions required to reveal. Endowed-progress: 3 regions at 0 so a
  // brand-new realm is already a connected heartland. Endless growth later = add
  // another atlas (data only). Geometry is on an 820×470 viewBox.
  realm: {
    viewBox: { w: 820, h: 470 },
    atlases: [
      {
        key: 'terra-questa',
        name: 'Terra Questa',
        regions: [
          { id: 'embergreen', name: 'Vale of Embergreen', at: 0, path: 'M300 150 q60 -34 132 -16 q44 12 58 56 q12 38 -14 70 q-20 24 -56 30 q-50 8 -96 -6 q-44 -14 -56 -52 q-14 -44 4 -72 q12 -18 28 -10 Z', label: { x: 306, y: 262 }, landmark: { kind: 'keep', x: 380, y: 160 } },
          { id: 'goldfield', name: 'Goldfield March', at: 0, path: 'M150 168 q46 -26 92 -8 q30 14 30 50 q0 38 -34 54 q-44 20 -86 4 q-32 -12 -34 -50 q-2 -36 32 -50 Z', label: { x: 158, y: 226 }, landmark: { kind: 'tower', x: 170, y: 196 } },
          { id: 'sunmeadow', name: 'Sunmeadow Hold', at: 0, path: 'M300 296 q56 -22 108 -4 q34 14 32 52 q-2 38 -44 50 q-56 16 -104 -4 q-34 -14 -34 -52 q2 -34 42 -42 Z', label: { x: 306, y: 372 }, landmark: { kind: 'town', x: 388, y: 316 } },
          { id: 'larkholt', name: 'Larkholt', at: 1, path: 'M196 110 q30 -16 58 -2 q20 12 16 36 q-6 26 -38 28 q-32 2 -44 -20 q-10 -26 8 -42 Z', label: { x: 200, y: 152 }, landmark: { kind: 'tower', x: 224, y: 128 } },
          { id: 'tidesend', name: "Tide's End", at: 2, path: 'M212 300 q28 -12 50 0 q18 10 14 32 q-6 24 -36 26 q-30 2 -42 -16 q-10 -24 14 -42 Z', label: { x: 216, y: 356 }, landmark: { kind: 'village', x: 240, y: 324 } },
          { id: 'crownspire', name: 'Crownspire Peaks', at: 4, path: 'M448 96 q44 -24 92 -6 q30 14 28 48 q-2 34 -38 46 q-44 14 -82 -6 q-28 -16 -24 -50 q3 -24 24 -32 Z', label: { x: 456, y: 166 }, landmark: { kind: 'mountains', x: 496, y: 128 } },
          { id: 'rivenwood', name: 'Rivenwood Reach', at: 6, path: 'M512 248 q44 -20 84 0 q28 14 24 50 q-4 36 -42 48 q-44 12 -78 -10 q-26 -18 -22 -52 q3 -26 34 -34 Z', label: { x: 520, y: 338 }, landmark: { kind: 'village', x: 540, y: 280 } },
          { id: 'palevale', name: 'Pale Vale', at: 9, path: 'M70 220 q34 -10 52 12 q14 20 0 42 q-16 24 -46 18 q-30 -6 -32 -34 q-2 -28 26 -38 Z', label: { x: 74, y: 270 }, landmark: { kind: 'forest', x: 96, y: 248 } },
          { id: 'greymoor', name: 'Greymoor', at: 12, path: 'M96 360 q40 -12 66 8 q22 16 12 42 q-12 28 -52 26 q-44 -2 -50 -32 q-4 -32 24 -44 Z', label: { x: 104, y: 404 }, landmark: { kind: 'village', x: 130, y: 388 } },
          { id: 'quietfens', name: 'Quiet Fens', at: 16, path: 'M320 372 q44 -14 74 6 q24 16 14 44 q-12 30 -56 28 q-48 -2 -56 -34 q-6 -34 24 -44 Z', label: { x: 330, y: 416 }, landmark: { kind: 'forest', x: 357, y: 400 } },
          { id: 'mistisles', name: 'Mist Isles', at: 21, path: 'M300 46 q34 -14 64 4 q22 14 14 40 q-8 26 -42 28 q-40 2 -52 -24 q-10 -32 16 -48 Z', label: { x: 312, y: 86 }, landmark: { kind: 'village', x: 332, y: 74 } },
          { id: 'hollowreach', name: 'Hollow Reach', at: 28, path: 'M70 70 q40 -22 92 -10 q34 8 40 40 q5 30 -22 44 q-40 20 -82 4 q-34 -14 -34 -44 q0 -22 6 -34 Z', label: { x: 92, y: 118 }, landmark: { kind: 'tower', x: 116, y: 104 } },
          { id: 'sunkenmarsh', name: 'Sunken Marsh', at: 36, path: 'M652 210 q40 -10 60 18 q16 24 0 50 q-18 28 -54 22 q-34 -6 -40 -38 q-6 -34 34 -52 Z', label: { x: 650, y: 262 }, landmark: { kind: 'forest', x: 682, y: 240 } },
          { id: 'ashlands', name: 'The Ashlands', at: 48, path: 'M560 360 q48 -16 86 8 q26 18 16 46 q-12 30 -56 30 q-52 0 -64 -32 q-10 -34 18 -52 Z', label: { x: 566, y: 408 }, landmark: { kind: 'mountains', x: 600, y: 392 } },
          { id: 'beyondveil', name: 'Beyond the Veil', at: 64, path: 'M648 96 q44 -18 92 0 q30 12 28 52 q-2 40 -42 52 q-46 14 -78 -12 q-26 -22 -22 -60 q3 -22 22 -32 Z', label: { x: 664, y: 148 }, landmark: { kind: 'keep', x: 694, y: 148 } }
        ]
      }
    ]
  },

  // --- The Arcade — quick brain-training breaks ------------------------------
  // Ticket-gated minigames (completions earn tickets, capped/day, never expire),
  // each a short workout for a REAL cognitive skill — attention, working memory,
  // processing speed, inhibition, flexibility, spatial reasoning. Honest framing:
  // you get better at the trained skill (and closely related ones); we do NOT
  // claim they make you "smarter" / raise IQ / prevent dementia. Tone rule: a
  // wrong answer never punishes — it just doesn't score.
  arcade: {
    // Brain-breaks are abundant (the games are beneficial, not a coin-farm):
    // everyone gets a few FREE each day (topped up to the floor on the first open,
    // never stacking), and every quest adds one more. `ticketsPerDay` is now just
    // a generous soft cap on EARNED tickets per day — never a real wall.
    ticketsFreePerDay: 3,
    ticketsPerCompletion: 1,
    ticketsPerDay: 20,
    games: {
      // Each game carries a Phosphor `icon` name + a skill-domain `color` token
      // (see theme.css --skill-*); the Arcade renders them as tinted badges
      // (app-wide icon convention — no emoji in UI chrome). Grouped by skill:
      // Memory & working memory — amethyst
      nback: { name: 'N-Back', icon: 'Stack', color: 'var(--skill-memory)', blurb: 'Match the cell from 2 steps back — a working-memory workout.' },
      spanrecall: { name: 'Span Recall', icon: 'Stairs', color: 'var(--skill-memory)', blurb: 'Repeat the growing sequence — stretch your memory span (Corsi).' },
      memory: { name: 'Memory Match', icon: 'Cards', color: 'var(--skill-memory)', blurb: 'Pair the cards from memory — a light visual-memory warm-up.', seconds: 90 },
      // Processing speed & attention — gold
      flashrecall: { name: 'Flash Recall', icon: 'Eye', color: 'var(--skill-speed)', blurb: 'Catch the flash, then place it — processing speed & attention (UFOV).', trials: 16 },
      aim: { name: 'Aim Trainer', icon: 'Crosshair', color: 'var(--skill-speed)', blurb: 'Hit the targets fast — sharpens visual attention & hand-eye speed.', seconds: 45 },
      reaction: { name: 'Reaction Time', icon: 'Lightning', color: 'var(--skill-speed)', blurb: 'Wait for green, then tap — measures your reaction speed.', trials: 5 },
      // Executive control: inhibition — emerald
      colorclash: { name: 'Color Clash', icon: 'Palette', color: 'var(--skill-focus)', blurb: 'Tap the ink colour, not the word — focus & inhibition (Stroop).', seconds: 45 },
      stoptap: { name: 'Stop Tap', icon: 'HandPalm', color: 'var(--skill-focus)', blurb: 'Tap on GO, freeze on STOP — trains response inhibition (go/no-go).' },
      // Flexibility & spatial reasoning — sky
      trackswitch: { name: 'Track Switch', icon: 'ArrowsLeftRight', color: 'var(--skill-flex)', blurb: 'Hop 1-A-2-B… — trains mental flexibility (task-switching).' },
      mentalspin: { name: 'Mental Spin', icon: 'ArrowsClockwise', color: 'var(--skill-flex)', blurb: 'Same shape or mirror? Rotate it in your head — spatial reasoning.' }
    }
  },

  // --- Focus timer: the Pomodoro family (execution layer) -------------------
  // ONE timer engine; each entry is a different research-backed cadence, so
  // shipping "Pomodoro" ships 52/17, ultradian deep-work, and Flowtime for free.
  // All durations in MINUTES. `work: null` = Flowtime (work until you choose to
  // stop; the break is a fraction of however long you actually focused).
  // Tone rule: a finished session only ever GAINS coins (small + daily-capped);
  // abandoning one costs nothing, and breaks are first-class, not "slacking".
  focus: {
    // `icon` names a Phosphor icon (mapped to a component in FocusView, tinted in
    // a small badge) — crisp + on-brand, replacing the old emoji glyphs (app-wide
    // icon convention; same move as the Eisenhower quadrants).
    presets: {
      pomodoro: { name: 'Pomodoro', icon: 'ClockCountdown', blurb: '25 on, 5 off — beat procrastination.', work: 25, break: 5, longBreak: 15, cyclesPerLong: 4 },
      fiftytwo: { name: '52 / 17', icon: 'HourglassMedium', blurb: 'Longer flow, real recovery (DeskTime study).', work: 52, break: 17 },
      ultradian: { name: 'Deep work 90', icon: 'Brain', blurb: 'Ride your 90-min ultradian focus cycle.', work: 90, break: 20 },
      flowtime: { name: 'Flowtime', icon: 'Waves', blurb: 'No fixed timer — stop when focus fades.', work: null, breakRatio: 0.2 }
    },
    /** A completed focus session pays a small chest, capped per day. */
    reward: { coinsPerSession: 3, dailySessionCap: 8 },
    /**
     * Timebox (time-blocking slice C): a hard-stop box for the CURRENT quest,
     * sized from its estimate × a planning-fallacy buffer (research says ×1.5 —
     * people under-estimate), floored so tiny estimates still give a usable box.
     * When the box ends it's just "another box, or move on?" — never a penalty.
     */
    timebox: { bufferMultiplier: 1.5, minMinutes: 5 }
  },

  // --- Eisenhower matrix: prioritization layer ------------------------------
  // The urgent×important 2×2, computed from fields quests ALREADY have. Tunable
  // so "urgent" / "important" can be re-defined without touching the engine.
  eisenhower: {
    /** Due within this many hours (or overdue) = urgent. Mirrors selection.urgencyHorizonHours. */
    urgentWithinHours: 24,
    /** Skippability levels that count as "important". */
    importantSkippability: ['Must do', 'Should do'],
    /** Priority levels that ALSO tip a quest into "important". */
    importantPriority: ['High', 'Critical'],
    /**
     * The four quadrants — label / blurb / colour, in 2×2 render order
     * (Do, Schedule, Minimize, Later). Tone: "Later", never "Delete".
     * `icon` names a Phosphor icon (mapped to the component in EisenhowerView) —
     * crisp + on-brand, replacing the old emoji icons (app-wide convention).
     */
    quadrants: [
      { key: 'do', name: 'Do now', icon: 'Fire', blurb: 'Urgent & important — tackle these first.', color: 'var(--candy)' },
      { key: 'schedule', name: 'Schedule', icon: 'CalendarBlank', blurb: 'Important, not urgent — plan time for these. Your real wins live here.', color: 'var(--brand-bright)' },
      { key: 'minimize', name: 'Minimize', icon: 'Lightning', blurb: 'Urgent, not important — do quickly or batch them.', color: 'var(--gold)' },
      { key: 'later', name: 'Later', icon: 'Moon', blurb: 'Neither urgent nor important — revisit when you have room.', color: 'var(--muted)' }
    ]
  },

  // --- §4 "current quest" selection scoring --------------------------------
  // Transparent, tunable scoring. Higher total score => more likely to be the
  // single surfaced "current quest". See engine/selectCurrentQuest.ts for how
  // these combine. The worked example in §4 is encoded as a unit expectation.
  selection: {
    weights: {
      /** Weight on time-pressure (gated by skippability — see note). */
      urgency: 1.0,
      /** Weight on raw priority level. */
      priority: 1.0,
      /** Small nudge toward quick wins so a fast must-do can slot ahead. */
      quickWin: 0.4
    },
    priorityScore: { Low: 0.2, Medium: 0.5, High: 0.8, Critical: 1.0 } as Record<Priority, number>,
    /**
     * Skippability GATES urgency: a soon-due "Nice to have" yields to a
     * higher-priority quest due later, but a soon-due "Must do" wins.
     */
    skippabilityScore: {
      'Must do': 1.0,
      'Should do': 0.5,
      'Nice to have': 0.2
    } as Record<Skippability, number>,
    /** Quests due within this horizon ramp urgency from 0 -> 1 (overdue = 1). */
    urgencyHorizonHours: 24,
    /** Baseline urgency for an undated quest (small, so dated ones lead). */
    undatedUrgency: 0.15,
    /** A quest at or under this estimate counts as a "quick win". */
    quickWinThresholdMinutes: 15
  }
} as const

export type Balance = typeof balance
