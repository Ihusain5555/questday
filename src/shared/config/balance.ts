// ---------------------------------------------------------------------------
// QuestDay — SINGLE SOURCE OF TRUTH for all tunable weights/curves.
//
// Everything here is deliberately gathered in one file so the XP economy and
// the "current quest" selection can be re-tuned without touching logic
// (§7 + §9 Definition-of-Done #9). Numbers below are the spec defaults — flagged
// for tuning, not final.
// ---------------------------------------------------------------------------

import type { Difficulty, Importance, Urgency } from '../types'

export const balance = {
  // --- §7 XP / currency economy -------------------------------------------
  /** difficultyMultiplier: Easy = 1.0, Medium = 1.5, Hard = 2.5 */
  difficultyMultiplier: { Easy: 1.0, Medium: 1.5, Hard: 2.5 } as Record<Difficulty, number>,

  /** baseXP = round(timeEstimateMinutes / 5) * difficultyMultiplier */
  xpPerMinuteDivisor: 5,

  /** importanceBonus: +10% (Medium), +20% (High); Low = 0. */
  importanceBonus: { Low: 0, Medium: 0.1, High: 0.2 } as Record<Importance, number>,

  // --- Levels --------------------------------------------------------------
  /** xpForLevel(n) = baseCost * n  (rising cost per level). */
  level: { baseCost: 100 },

  // --- Streak (§7) ---------------------------------------------------------
  /** +5% per consecutive day, capped at +25%. Never punitive. */
  streak: { bonusPerDay: 0.05, maxBonus: 0.25 },

  // --- Active mode (§8) cadences -------------------------------------------
  // How "present" the coach is. Kept here (not buried in the scheduler) so the
  // interruption feel can be re-tuned in one place, like every other knob.
  activeMode: {
    /** Scheduler tick cadence (awareness/nudge checks), seconds. */
    pollIntervalSec: 30,
    /** Minimum minutes between off-task "back on track?" nudges. */
    offTaskNudgeCooldownMin: 5,
    /** Quiet window after "proceed" on a soft-friction prompt before it re-fires, seconds. */
    proceedGraceSec: 30,
    /** Short grace for the focus hand-off back to QuestDay after dismissing, seconds. */
    dismissGraceSec: 3
  },

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
  // another atlas (data only). Geometry is on a 1200×820 viewBox (v1.10 "Inked
  // Watercolor" world-map look). FROZEN SAVE KEY: each region `id` below is the
  // durable join key for a user's charted discoveries (settings.realmChronicle
  // stores {region: id}); NEVER rename/remove an id or change `at` — that orphans
  // saved progress / shifts unlocks. Re-skins change path/label/landmark only.
  realm: {
    viewBox: { w: 1200, h: 820 },
    atlases: [
      {
        key: 'terra-questa',
        name: 'Terra Questa',
        regions: [
          { id: 'embergreen', name: 'Greenhaven', at: 0, path: 'M562 426 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 620, y: 460 }, landmark: { kind: 'town', x: 620, y: 420 } },
          { id: 'goldfield', name: 'Goldfield March', at: 0, path: 'M542 246 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 600, y: 280 }, landmark: { kind: 'town', x: 600, y: 240 } },
          { id: 'sunmeadow', name: 'Sunmeadow Hold', at: 0, path: 'M757 216 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 815, y: 250 }, landmark: { kind: 'keep', x: 815, y: 210 } },
          { id: 'larkholt', name: 'Larkholt', at: 1, path: 'M542 606 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 600, y: 640 }, landmark: { kind: 'town', x: 600, y: 600 } },
          { id: 'tidesend', name: "Tide's End", at: 2, path: 'M212 491 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 270, y: 525 }, landmark: { kind: 'lighthouse', x: 270, y: 485 } },
          { id: 'crownspire', name: 'Crownspire Peaks', at: 4, path: 'M762 351 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 820, y: 385 }, landmark: { kind: 'mountains', x: 820, y: 345 } },
          { id: 'rivenwood', name: 'Rivenwood Reach', at: 6, path: 'M372 366 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 430, y: 400 }, landmark: { kind: 'forest', x: 430, y: 360 } },
          { id: 'palevale', name: 'Pale Vale', at: 9, path: 'M352 221 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 410, y: 255 }, landmark: { kind: 'forest', x: 410, y: 215 } },
          { id: 'greymoor', name: 'Greymoor', at: 12, path: 'M712 486 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 770, y: 520 }, landmark: { kind: 'tower', x: 770, y: 480 } },
          { id: 'quietfens', name: 'Quiet Fens', at: 16, path: 'M362 606 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 420, y: 640 }, landmark: { kind: 'marsh', x: 420, y: 600 } },
          { id: 'mistisles', name: 'Mist Isles', at: 21, path: 'M937 366 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 995, y: 400 }, landmark: { kind: 'mist', x: 995, y: 360 } },
          { id: 'hollowreach', name: 'Hollow Reach', at: 28, path: 'M152 654 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 210, y: 688 }, landmark: { kind: 'tower', x: 210, y: 648 } },
          { id: 'sunkenmarsh', name: 'Sunken Marsh', at: 36, path: 'M732 606 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 790, y: 640 }, landmark: { kind: 'marsh', x: 790, y: 600 } },
          { id: 'ashlands', name: 'The Ashlands', at: 48, path: 'M412 476 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 470, y: 510 }, landmark: { kind: 'mountains', x: 470, y: 470 } },
          { id: 'beyondveil', name: 'Beyond the Veil', at: 64, path: 'M994 616 a58 54 0 1 0 116 0 a58 54 0 1 0 -116 0 Z', label: { x: 1052, y: 650 }, landmark: { kind: 'keep', x: 1052, y: 610 } }
        ]
      }
    ]
  },

  // --- The Civilization ("Your Realm") — the reward world (v1.10, in progress) -
  // Gains-only: completing quests GROWS a medieval-fantasy town through 7 stages
  // (Camp -> Empire) and settles multiple towns on the Terra Questa world map.
  // Stage + town unlocks are a PURE FUNCTION of all-time completions (see
  // engine/civilization.ts) — nothing here is persisted, so ↩ Restore stays exact.
  // `worldRegionId` pins a town to an existing realm region (balance.realm). New
  // towns/biomes later = data-only appends. Thresholds are retunable, not final.
  civilization: {
    /** World stages in order. `at` = all-time completions to ENTER the stage. */
    stages: [
      { key: 'camp', name: 'Camp', at: 0 },
      { key: 'settlement', name: 'Settlement', at: 5 },
      { key: 'village', name: 'Village', at: 15 },
      { key: 'town', name: 'Town', at: 40 },
      { key: 'city', name: 'City', at: 100 },
      { key: 'kingdom', name: 'Kingdom', at: 250 },
      { key: 'empire', name: 'Empire', at: 600 }
    ],
    /** Launch towns + locked "coming soon" lands. `unlockAt` = completions to
     *  settle a town; `comingSoon` lands render as misted silhouettes (no art yet). */
    towns: [
      { id: 'greenhaven', name: 'Greenhaven Heartland', biome: 'green', worldRegionId: 'embergreen', unlockAt: 0, comingSoon: false },
      { id: 'goldport', name: 'Goldport Harbor', biome: 'coast', worldRegionId: 'tidesend', unlockAt: 15, comingSoon: false },
      { id: 'frostpeak', name: 'Frostpeak', biome: 'snow', worldRegionId: 'crownspire', unlockAt: 100, comingSoon: true },
      { id: 'sunreach', name: 'Sun Reach', biome: 'desert', worldRegionId: 'ashlands', unlockAt: 250, comingSoon: true }
    ],
    /** Each completion adds ONE structure to the active town, sized by difficulty. */
    buildingScaleByDifficulty: { Easy: 'small', Medium: 'cottage', Hard: 'landmark' } as Record<Difficulty, string>,
    /** XP-driven town growth (v1.10). Buildings appear as all-time XP accrues:
     *  count = min(cap, startCount + floor(totalXp / xpPerBuilding)). A PURE function
     *  of XP — nothing stored — so ↩ Restore (which claws XP back exactly) walks the
     *  town back exactly. `startCount` keeps a fresh town from looking empty; `cap`
     *  bounds it to the 7x7 town grid (the layout was tuned for 30). `xpPerBuilding`
     *  is the pacing knob — expect to RAISE it after play-feel (deliberately frequent). */
    buildings: { startCount: 2, xpPerBuilding: 20, cap: 30 }
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
      nback: { name: 'N-Back', icon: 'Stack', color: 'var(--skill-memory)', blurb: 'Match the cell from 2 steps back — a working-memory workout.', trials: 24, stepMs: 2400, litMs: 1650, matchRate: 0.32 },
      spanrecall: { name: 'Span Recall', icon: 'Stairs', color: 'var(--skill-memory)', blurb: 'Repeat the growing sequence — stretch your memory span (Corsi).', seconds: 75, maxLen: 9, litMs: 600, gapMs: 220 },
      memory: { name: 'Memory Match', icon: 'Cards', color: 'var(--skill-memory)', blurb: 'Pair the cards from memory — a light visual-memory warm-up.', seconds: 90 },
      // Processing speed & attention — gold
      flashrecall: { name: 'Flash Recall', icon: 'Eye', color: 'var(--skill-speed)', blurb: 'Catch the flash, then place it — processing speed & attention (UFOV).', trials: 16, startMs: 420, minMs: 90, maxMs: 650, stepDownMs: 40, stepUpMs: 55 },
      aim: { name: 'Aim Trainer', icon: 'Crosshair', color: 'var(--skill-speed)', blurb: 'Hit the targets fast — sharpens visual attention & hand-eye speed.', seconds: 45 },
      reaction: { name: 'Reaction Time', icon: 'Lightning', color: 'var(--skill-speed)', blurb: 'Wait for green, then tap — measures your reaction speed.', trials: 5 },
      // Executive control: inhibition — emerald
      colorclash: { name: 'Color Clash', icon: 'Palette', color: 'var(--skill-focus)', blurb: 'Tap the ink colour, not the word — focus & inhibition (Stroop).', seconds: 45 },
      stoptap: { name: 'Stop Tap', icon: 'HandPalm', color: 'var(--skill-focus)', blurb: 'Tap on GO, freeze on STOP — trains response inhibition (go/no-go).', seconds: 45, minGapMs: 420, minWindowMs: 380 },
      // Flexibility & spatial reasoning — sky
      trackswitch: { name: 'Track Switch', icon: 'ArrowsLeftRight', color: 'var(--skill-flex)', blurb: 'Hop 1-A-2-B… — trains mental flexibility (task-switching).', seconds: 50 },
      mentalspin: { name: 'Mental Spin', icon: 'ArrowsClockwise', color: 'var(--skill-flex)', blurb: 'Same shape or mirror? Rotate it in your head — spatial reasoning.', seconds: 45 }
    }
  },

  // --- Focus timer: the Pomodoro family (execution layer) -------------------
  // ONE timer engine; each entry is a different research-backed cadence, so
  // shipping "Pomodoro" ships 52/17, ultradian deep-work, and Flowtime for free.
  // All durations in MINUTES. `work: null` = Flowtime (work until you choose to
  // stop; the break is a fraction of however long you actually focused).
  // Tone rule: abandoning a session costs nothing, and breaks are first-class,
  // not "slacking".
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
    /**
     * Timebox (time-blocking slice C): a hard-stop box for the CURRENT quest,
     * sized from its estimate × a planning-fallacy buffer (research says ×1.5 —
     * people under-estimate), floored so tiny estimates still give a usable box.
     * When the box ends it's just "another box, or move on?" — never a penalty.
     */
    timebox: { bufferMultiplier: 1.5, minMinutes: 5 }
  },

  // --- Eisenhower matrix: prioritization layer ------------------------------
  // The urgent×important 2×2, mapped straight from the hand-set importance/urgency
  // levels. Tunable so which levels count as "important"/"urgent" can be
  // re-defined without touching the engine.
  eisenhower: {
    /** Importance levels that count as "important" (Eisenhower y-axis). */
    importantLevels: ['Medium', 'High'],
    /** Urgency levels that count as "urgent" (Eisenhower x-axis). */
    urgentLevels: ['Medium', 'High'],
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
      /** Weight on hand-set importance. */
      importance: 1.0,
      /** Weight on hand-set urgency. */
      urgency: 1.0,
      /** Small nudge toward quick wins so a fast must-do can slot ahead. */
      quickWin: 0.4
    },
    /** Score per importance level — the higher, the more it leads. */
    importanceScore: { Low: 0.2, Medium: 0.5, High: 1.0 } as Record<Importance, number>,
    /** Score per urgency level (hand-set; no longer derived from the due date). */
    urgencyScore: { Low: 0.2, Medium: 0.5, High: 1.0 } as Record<Urgency, number>,
    /** A quest at or under this estimate counts as a "quick win". */
    quickWinThresholdMinutes: 15
  }
} as const

export type Balance = typeof balance
