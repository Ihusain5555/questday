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

  // --- The Arcade (v1.4) -----------------------------------------------------
  // Ticket-gated minigames: completions earn tickets (capped/day, never expire),
  // a good round pays a SMALL coin bonus (capped) — a chest on top of real
  // effort, never a coin farm. coins = min(max, floor(score * rate)).
  arcade: {
    /** Tickets granted per quest completion, and the daily earn cap. */
    ticketsPerCompletion: 1,
    ticketsPerDay: 3,
    games: {
      aim: { name: 'Aim Trainer', emoji: '🎯', blurb: 'Click the targets — fast.', rate: 0.5, max: 15, seconds: 45 },
      reaction: { name: 'Reaction Time', emoji: '⚡', blurb: 'Wait for green. Click.', rate: 0.1, max: 15, trials: 5 },
      memory: { name: 'Memory Match', emoji: '🧠', blurb: 'Flip the pairs before time runs out.', rate: 1, max: 15, seconds: 90 },
      snake: { name: 'Snake', emoji: '🐍', blurb: 'Eat. Grow. Don’t bite yourself.', rate: 1, max: 15 },
      blockdrop: { name: 'Block Drop', emoji: '🧱', blurb: 'Stack falling blocks, clear lines.', rate: 3, max: 15, seconds: 120 },
      bubble: { name: 'Bubble Pop', emoji: '🫧', blurb: 'Shoot bubbles into same-color groups.', rate: 0.25, max: 15, seconds: 120 },
      runner: { name: 'Lane Dash', emoji: '🏃', blurb: 'Three lanes. Dodge everything.', rate: 0.5, max: 15 },
      rhythm: { name: 'Spike Rush', emoji: '🔺', blurb: 'One button. Jump the spikes.', rate: 0.5, max: 15 },
      fruit: { name: 'Fruit Slice', emoji: '🍉', blurb: 'Slice the fruit, skip the bombs.', rate: 0.5, max: 15, seconds: 60 },
      hopper: { name: 'Road Hopper', emoji: '🐔', blurb: 'Hop across the traffic.', rate: 1, max: 15 },
      maze: { name: 'Maze Muncher', emoji: '👾', blurb: 'Eat the dots, dodge the ghosts.', rate: 0.25, max: 15, seconds: 90 },
      // Brain-training trio (inspired by cognitive-training research): each is a
      // real, evidence-grounded mental workout dressed as a quick arcade round.
      colorclash: { name: 'Color Clash', emoji: '🎨', blurb: 'Tap the ink colour, not the word.', rate: 0.5, max: 15, seconds: 45 },
      flashrecall: { name: 'Flash Recall', emoji: '👁️', blurb: 'A flash, then gone — where was it?', rate: 1, max: 15, trials: 16 },
      nback: { name: 'N-Back', emoji: '🔢', blurb: 'Match the cell from 2 steps back.', rate: 2, max: 15 }
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
    presets: {
      pomodoro: { name: 'Pomodoro', emoji: '🍅', blurb: '25 on, 5 off — beat procrastination.', work: 25, break: 5, longBreak: 15, cyclesPerLong: 4 },
      fiftytwo: { name: '52 / 17', emoji: '⏳', blurb: 'Longer flow, real recovery (DeskTime study).', work: 52, break: 17 },
      ultradian: { name: 'Deep work 90', emoji: '🧠', blurb: 'Ride your 90-min ultradian focus cycle.', work: 90, break: 20 },
      flowtime: { name: 'Flowtime', emoji: '🌊', blurb: 'No fixed timer — stop when focus fades.', work: null, breakRatio: 0.2 }
    },
    /** A completed focus session pays a small chest, capped per day. */
    reward: { coinsPerSession: 3, dailySessionCap: 8 }
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
     */
    quadrants: [
      { key: 'do', name: 'Do now', emoji: '🔥', blurb: 'Urgent & important — tackle these first.', color: 'var(--candy)' },
      { key: 'schedule', name: 'Schedule', emoji: '📅', blurb: 'Important, not urgent — plan time for these. Your real wins live here.', color: 'var(--brand-bright)' },
      { key: 'minimize', name: 'Minimize', emoji: '⚡', blurb: 'Urgent, not important — do quickly or batch them.', color: 'var(--gold)' },
      { key: 'later', name: 'Later', emoji: '🌙', blurb: 'Neither urgent nor important — revisit when you have room.', color: 'var(--muted)' }
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
