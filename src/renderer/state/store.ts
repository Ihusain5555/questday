import { create } from 'zustand'
import type {
  Database,
  DatabasePatch,
  Quest,
  Settings,
  SubTask,
  TimeFrame
} from '@shared/types'
import { applyCompletion, xpForLevel, type CompletionAward } from '@shared/engine/rewards'
import { computeDayChange, ymd, type DayChange } from '@shared/engine/rollover'
import {
  speciesByKey,
  canPlantAt,
  plantItem,
  moveItem,
  themeByKey,
  growOnCompletion,
  welcomeVisitors,
  weatherFor,
  mutationChance,
  rollMutation,
  applyMutation,
  isHarvestable,
  harvestPayout,
  harvestItem,
  dailyStock,
  itemEmoji
} from '@shared/engine/garden'
import { balance } from '@shared/config/balance'

/** Transient celebration payload (local to the window that completed a quest). */
export interface Celebration {
  award: CompletionAward
  questTitle: string
  /** What this completion grew in the active world (if anything). */
  grew?: { name: string; emoji: string } | null
  /** The mutation it rolled while growing (jackpot moment), if any. */
  mutation?: { name: string; emoji: string; mult: number } | null
  /** True when this completion earned an arcade ticket (within the daily cap). */
  ticket?: boolean
}

/** Transient harvest payout flash (local to the harvesting window). */
export interface HarvestFlash {
  coins: number
  name: string
  doubled: boolean
}

/** Local YYYY-MM-DD (used for streak day-counting). */
function todayStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Fields the user supplies when creating/editing a quest. */
export interface QuestInput {
  title: string
  difficulty: Quest['difficulty']
  priority: Quest['priority']
  skippability: Quest['skippability']
  timeEstimateMinutes: number
  dueAt: string | null
  timeFrameId: string
  subTasks: { id?: string; title: string; timeEstimateMinutes?: number }[]
  /** Recurring schedule: weekdays (0=Sun..6=Sat); empty = one-off (v1.5). */
  recurDays: number[]
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.round(performance.now() * 1000)}-${Math.floor(Math.random() * 1e6)}`

function buildSubTasks(items: { id?: string; title: string; timeEstimateMinutes?: number }[]): SubTask[] {
  return items
    .filter((s) => s.title.trim().length > 0)
    .map((s, i) => ({
      id: s.id ?? uid(),
      title: s.title.trim(),
      order: i,
      done: false,
      timeEstimateMinutes: s.timeEstimateMinutes
    }))
}

interface AppStore {
  db: Database | null
  loading: boolean
  connected: boolean
  refresh: () => Promise<void>
  /** Load state and subscribe to cross-window updates. Idempotent. */
  connect: () => Promise<void>
  save: (patch: DatabasePatch) => Promise<void>

  // ---- Quests ----
  createQuest: (input: QuestInput) => Promise<void>
  updateQuest: (id: string, input: QuestInput) => Promise<void>
  deleteQuest: (id: string) => Promise<void>
  dropQuest: (id: string) => Promise<void>
  moveQuestToFrame: (id: string, timeFrameId: string) => Promise<void>
  moveQuestBefore: (id: string, targetId: string) => Promise<void>
  toggleSubTask: (questId: string, subTaskId: string) => Promise<void>
  completeQuest: (id: string) => Promise<void>
  /** Undo an accidental complete: back to active. Earned rewards are kept. */
  restoreQuest: (id: string) => Promise<void>

  // ---- Daily rollover (§6) ----
  /** Process a transition into today (carry over + flag past-due). Idempotent per day. */
  runDayChange: () => Promise<DayChange | null>
  /** Past-due review resolutions — never punitive. */
  keepQuest: (id: string) => Promise<void>
  rescheduleQuest: (id: string, dueIso: string | null) => Promise<void>

  // ---- Celebration (transient, this window only) ----
  celebration: Celebration | null
  clearCelebration: () => void

  // ---- Settings ----
  updateSettings: (patch: Partial<Settings>) => Promise<void>

  // ---- Reward world (garden) ----
  /** Buy a catalog species with currency and plant it on a free tile. */
  plantGardenItem: (speciesKey: string, x: number, y: number) => Promise<void>
  /** Rearrange: move a placed item to a free tile. Free, purely positional. */
  moveGardenItem: (id: string, x: number, y: number) => Promise<void>
  /** Switch the world theme. Free — every theme keeps its own plot. */
  setWorldTheme: (themeKey: string) => Promise<void>
  /** Pick a ripe crop: pays coins (mutations multiply), plant regrows. */
  harvestGardenItem: (id: string) => Promise<void>
  harvestFlash: HarvestFlash | null
  clearHarvestFlash: () => void
  /** Morning-dew news ("overnight, your X grew") from today's day change. */
  dewNews: string | null
  clearDewNews: () => void

  // ---- Arcade (v1.4) ----
  /** Spend one ticket to start a round. Returns false if none left. */
  spendArcadeTicket: () => Promise<boolean>
  /** End a round: pays the (capped) coin bonus and records a new best. */
  finishArcadeRound: (gameKey: string, score: number) => Promise<{ coins: number; newBest: boolean }>

  // ---- Focus timer ----
  /**
   * Record a completed focus session: pays a small coin bonus while under the
   * daily cap (never punitive — a capped session still "counts" as a win, it
   * just stops paying). Returns the coins actually awarded (0 once capped).
   */
  finishFocusSession: () => Promise<{ coins: number; capped: boolean }>

  // ---- Time frames ----
  createTimeFrame: (tf: Omit<TimeFrame, 'id' | 'order'>) => Promise<void>
  updateTimeFrame: (id: string, patch: Partial<Omit<TimeFrame, 'id'>>) => Promise<void>
  deleteTimeFrame: (id: string) => Promise<void>
  moveTimeFrame: (id: string, dir: -1 | 1) => Promise<void>
}

export const useStore = create<AppStore>((set, get) => ({
  db: null,
  loading: true,
  connected: false,
  celebration: null,
  harvestFlash: null,
  dewNews: null,

  refresh: async () => {
    const db = await window.questday.getState()
    set({ db, loading: false })
  },

  connect: async () => {
    if (!get().connected) {
      set({ connected: true })
      // Push updates from any window (and the main process) into this store.
      window.questday.onChange((db) => set({ db, loading: false }))
    }
    await get().refresh()
  },

  save: async (patch) => {
    const db = await window.questday.saveState(patch)
    set({ db })
  },

  // ---- Quests --------------------------------------------------------------
  createQuest: async (input) => {
    const db = get().db
    if (!db) return
    const maxOrder = db.quests.reduce((m, q) => Math.max(m, q.sortOrder), -1)
    const quest: Quest = {
      id: uid(),
      title: input.title.trim(),
      subTasks: buildSubTasks(input.subTasks),
      difficulty: input.difficulty,
      priority: input.priority,
      skippability: input.skippability,
      timeEstimateMinutes: Math.max(0, Math.round(input.timeEstimateMinutes)),
      dueAt: input.dueAt,
      timeFrameId: input.timeFrameId,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      sortOrder: maxOrder + 1,
      recurDays: input.recurDays.length > 0 ? input.recurDays : undefined
    }
    await get().save({ quests: [...db.quests, quest] })
  },

  updateQuest: async (id, input) => {
    const db = get().db
    if (!db) return
    const quests = db.quests.map((q) =>
      q.id === id
        ? {
            ...q,
            title: input.title.trim(),
            // Preserve done-state of sub-tasks that survive an edit (matched by id).
            subTasks: buildSubTasks(input.subTasks).map((s) => {
              const prev = q.subTasks.find((p) => p.id === s.id)
              return prev ? { ...s, done: prev.done } : s
            }),
            difficulty: input.difficulty,
            priority: input.priority,
            skippability: input.skippability,
            timeEstimateMinutes: Math.max(0, Math.round(input.timeEstimateMinutes)),
            dueAt: input.dueAt,
            timeFrameId: input.timeFrameId,
            recurDays: input.recurDays.length > 0 ? input.recurDays : undefined
          }
        : q
    )
    await get().save({ quests })
  },

  deleteQuest: async (id) => {
    const db = get().db
    if (!db) return
    await get().save({ quests: db.quests.filter((q) => q.id !== id) })
  },

  /** Move a quest into another time frame (drag-and-drop); lands at the end. */
  moveQuestToFrame: async (id, timeFrameId) => {
    const db = get().db
    if (!db) return
    const quest = db.quests.find((q) => q.id === id)
    if (!quest || quest.timeFrameId === timeFrameId) return
    const maxOrder = db.quests
      .filter((q) => q.timeFrameId === timeFrameId)
      .reduce((m, q) => Math.max(m, q.sortOrder), -1)
    const quests = db.quests.map((q) =>
      q.id === id ? { ...q, timeFrameId, sortOrder: maxOrder + 1 } : q
    )
    await get().save({ quests })
  },

  /** Drop a quest onto another quest: insert it before the target, adopting the
   *  target's frame. Powers within-frame reordering (and cross-frame drops onto
   *  a specific position). */
  moveQuestBefore: async (id, targetId) => {
    const db = get().db
    if (!db || id === targetId) return
    const dragged = db.quests.find((q) => q.id === id)
    const target = db.quests.find((q) => q.id === targetId)
    if (!dragged || !target) return
    // Ordered active quests of the target frame, dragged removed, then re-inserted
    // before the target; sortOrder is rewritten to match the new positions.
    const frameQuests = db.quests
      .filter((q) => q.timeFrameId === target.timeFrameId && q.status === 'active' && q.id !== id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const at = frameQuests.findIndex((q) => q.id === targetId)
    if (at < 0) return
    frameQuests.splice(at, 0, dragged)
    const orderById = new Map(frameQuests.map((q, i) => [q.id, i]))
    const quests = db.quests.map((q) => {
      if (q.id === id) return { ...q, timeFrameId: target.timeFrameId, sortOrder: orderById.get(id) ?? 0 }
      const ord = orderById.get(q.id)
      return ord === undefined ? q : { ...q, sortOrder: ord }
    })
    await get().save({ quests })
  },

  /** Abandon a quest — no penalty (§6). Kept in history as 'dropped'. */
  dropQuest: async (id) => {
    const db = get().db
    if (!db) return
    const quests = db.quests.map((q) => (q.id === id ? { ...q, status: 'dropped' as const } : q))
    await get().save({ quests })
  },

  /** Tick a sub-task on/off (progress, not quest completion — no XP here). */
  toggleSubTask: async (questId, subTaskId) => {
    const db = get().db
    if (!db) return
    const quests = db.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            subTasks: q.subTasks.map((s) => (s.id === subTaskId ? { ...s, done: !s.done } : s))
          }
        : q
    )
    await get().save({ quests })
  },

  /**
   * Complete a quest: award XP/currency, advance level + streak (§7), and stage
   * a celebration for this window. All sub-tasks are marked done. Never punitive.
   */
  completeQuest: async (id) => {
    const db = get().db
    if (!db) return
    const quest = db.quests.find((q) => q.id === id && q.status === 'active')
    if (!quest) return
    const today = todayStr()
    const award = applyCompletion(quest, db.player, today)
    const completedAt = new Date().toISOString()
    const quests = db.quests.map((q) =>
      q.id === id
        ? {
            ...q,
            status: 'completed' as const,
            completedAt,
            // Remember the exact payout so an accidental complete can be
            // restored with a precise refund.
            completionAward: { xp: award.xpGained, currency: award.currencyGained },
            subTasks: q.subTasks.map((s) => ({ ...s, done: true })),
            // Recurring quests log the day, so the daily reset never erases
            // the win from Stats (v1.5).
            completionDates:
              (q.recurDays?.length ?? 0) > 0 && !(q.completionDates ?? []).includes(today)
                ? [...(q.completionDates ?? []), today]
                : q.completionDates
          }
        : q
    )
    // The garden shares the celebration: one plant grows a stage (and may roll
    // a weather mutation — jackpot, positive-only), and a new best streak may
    // bring a visitor. (All of it only ever ADDS — tone rule.)
    const growth = growOnCompletion(db.garden)
    let gardenNext = growth.garden
    let grew: Celebration['grew'] = null
    let mutation: Celebration['mutation'] = null
    if (growth.grew) {
      const species = speciesByKey(growth.grew.theme, growth.grew.species)
      grew = { name: species?.name ?? 'plant', emoji: itemEmoji(growth.grew) }
      const chance = mutationChance(award.newStreak, db.garden.bestStreak)
      const rolled = rollMutation(
        growth.grew,
        weatherFor(new Date()).key,
        chance,
        Math.random(),
        Math.random()
      )
      if (rolled) {
        gardenNext = applyMutation(gardenNext, growth.grew.id, rolled.key)
        mutation = { name: rolled.name, emoji: rolled.emoji, mult: rolled.mult }
      }
    }
    const { garden } = welcomeVisitors(gardenNext, award.newStreak)

    // Arcade ticket (v1.4): completions earn a play, up to the daily cap.
    // Tickets never expire — only the EARN rate is capped, never the balance.
    let arcade = db.arcade
    let player = award.newPlayer
    let ticket = false
    const earnedToday = arcade.ticketsEarnedOn === today ? arcade.ticketsEarnedCount : 0
    if (earnedToday < balance.arcade.ticketsPerDay) {
      const grant = balance.arcade.ticketsPerCompletion
      arcade = { ...arcade, ticketsEarnedOn: today, ticketsEarnedCount: earnedToday + grant }
      player = { ...player, arcadeTickets: player.arcadeTickets + grant }
      ticket = true
    }

    await get().save({ quests, player, garden, arcade })
    set({ celebration: { award, questTitle: quest.title, grew, mutation, ticket } })
  },

  /**
   * Put a completed quest back to active (mis-click insurance), reversing the
   * completion's payout exactly:
   *  - XP comes back out, rolling levels back if the completion leveled up.
   *  - Coins come back out. If they were already spent in the World, garden
   *    purchases are refunded (newest first: item removed, cost returned)
   *    UNTIL the balance covers the claw-back — THEN it's removed. Coins
   *    earned from other quests are never touched; balance never goes negative.
   *  - Sub-tasks come back unchecked (completion force-ticked them all).
   * Completions from before awards were recorded take back nothing — when the
   * amount is unknown we err on never removing deserved coins.
   */
  restoreQuest: async (id) => {
    const db = get().db
    if (!db) return
    const quest = db.quests.find((q) => q.id === id && q.status === 'completed')
    if (!quest) return
    const award = quest.completionAward ?? { xp: 0, currency: 0 }

    // XP claw-back: exact inverse of the level-up loop in applyCompletion.
    let level = db.player.level
    let xp = db.player.xp - award.xp
    while (xp < 0 && level > 1) {
      level -= 1
      xp += xpForLevel(level)
    }
    if (xp < 0) xp = 0

    // Coin claw-back with refund-first: top the balance up by undoing recent
    // garden purchases before deducting, so the deduction can only take the
    // undeserved coins.
    let currency = db.player.currency
    let garden = db.garden
    if (currency < award.currency && garden.items.length > 0) {
      const newestFirst = [...garden.items].sort((a, b) => b.plantedAt.localeCompare(a.plantedAt))
      const refunded = new Set<string>()
      for (const item of newestFirst) {
        if (currency >= award.currency) break
        // Purchases can sit in any world — refund newest-first across all themes.
        const species = speciesByKey(item.theme, item.species)
        if (!species) continue
        currency += species.cost
        refunded.add(item.id)
      }
      if (refunded.size > 0) {
        garden = { ...garden, items: garden.items.filter((i) => !refunded.has(i.id)) }
      }
    }
    currency = Math.max(0, currency - award.currency)

    const quests = db.quests.map((q) =>
      q.id === id
        ? {
            ...q,
            status: 'active' as const,
            completedAt: null,
            completionAward: undefined,
            subTasks: q.subTasks.map((s) => ({ ...s, done: false })),
            // A restored recurring completion also leaves the history (the
            // win is being taken back by the user, not by the system).
            completionDates: q.completionDates?.filter((d) => d !== todayStr())
          }
        : q
    )
    await get().save({ quests, player: { ...db.player, xp, level, currency }, garden })
  },

  clearCelebration: () => set({ celebration: null }),
  clearHarvestFlash: () => set({ harvestFlash: null }),
  clearDewNews: () => set({ dewNews: null }),

  // ---- Daily rollover ------------------------------------------------------
  runDayChange: async () => {
    const db = get().db
    if (!db) return null
    const now = new Date()
    const change = computeDayChange(db, now)
    if (!change) return null

    // Carry over non-overdue quests (stay active; bump display counter). Skip the
    // counter on first run since nothing was truly "carried" yet.
    const carriedIds = new Set(change.firstRun ? [] : change.carried.map((q) => q.id))
    // Recurring quests completed on a previous day renew: a fresh chance with
    // full payout again. History stays in completionDates (v1.5).
    const renewIds = new Set(change.recurringReady.map((q) => q.id))
    const quests = db.quests.map((q) => {
      if (renewIds.has(q.id))
        return {
          ...q,
          status: 'active' as const,
          completedAt: null,
          completionAward: undefined,
          subTasks: q.subTasks.map((s) => ({ ...s, done: false }))
        }
      return carriedIds.has(q.id) ? { ...q, rolledOverCount: (q.rolledOverCount ?? 0) + 1 } : q
    })

    // Morning dew (v1.3): a new day grows a plant or two for free in the active
    // world — a small idle gift that never replaces the quest-driven loop.
    // Each dew growth can roll a mutation too (a lucky morning).
    let garden = db.garden
    const dewGrown: string[] = []
    if (!change.firstRun) {
      const dewCount =
        garden.bestStreak >= 14 ? balance.garden.harvest.perks.dewPlantsAt14 : balance.garden.dew.plants
      for (let i = 0; i < dewCount; i++) {
        const growth = growOnCompletion(garden)
        if (!growth.grew) break
        garden = growth.garden
        const species = speciesByKey(growth.grew.theme, growth.grew.species)
        dewGrown.push(`${itemEmoji(growth.grew)} ${species?.name ?? 'something'}`)
        const rolled = rollMutation(
          growth.grew,
          weatherFor(now).key,
          mutationChance(db.player.streakCount, garden.bestStreak),
          Math.random(),
          Math.random()
        )
        if (rolled) garden = applyMutation(garden, growth.grew.id, rolled.key)
      }
    }

    await get().save({ quests, garden, lastSeenDate: ymd(now) })
    if (dewGrown.length > 0) {
      set({ dewNews: `🌅 Overnight dew: ${dewGrown.join(' and ')} grew while you were away.` })
    }
    return change
  },

  /** "Still relevant" — keep active and clear the passed deadline so it stops nagging. */
  keepQuest: async (id) => {
    const db = get().db
    if (!db) return
    const quests = db.quests.map((q) => (q.id === id ? { ...q, dueAt: null } : q))
    await get().save({ quests })
  },

  rescheduleQuest: async (id, dueIso) => {
    const db = get().db
    if (!db) return
    const quests = db.quests.map((q) => (q.id === id ? { ...q, dueAt: dueIso } : q))
    await get().save({ quests })
  },

  // ---- Settings ------------------------------------------------------------
  updateSettings: async (patch) => {
    const db = get().db
    if (!db) return
    await get().save({ settings: { ...db.settings, ...patch } })
  },

  // ---- Reward world (garden) -------------------------------------------------
  plantGardenItem: async (speciesKey, x, y) => {
    const db = get().db
    if (!db) return
    const species = speciesByKey(db.garden.theme, speciesKey)
    if (!species) return
    if (db.player.level < species.unlockLevel) return
    if (db.player.currency < species.cost) return
    // Rarer seeds rotate daily — only today's stock is purchasable.
    if (!dailyStock(db.garden.theme, todayStr()).has(species.key)) return
    if (!canPlantAt(db.garden, db.player.level, x, y)) return
    const garden = plantItem(db.garden, species, x, y, uid(), new Date().toISOString(), db.player.level)
    await get().save({
      garden,
      player: { ...db.player, currency: db.player.currency - species.cost }
    })
  },

  moveGardenItem: async (id, x, y) => {
    const db = get().db
    if (!db) return
    const garden = moveItem(db.garden, db.player.level, id, x, y)
    if (garden === db.garden) return
    await get().save({ garden })
  },

  setWorldTheme: async (themeKey) => {
    const db = get().db
    if (!db || db.garden.theme === themeKey) return
    // Resolve through the catalog so an unknown key can never be persisted.
    await get().save({ garden: { ...db.garden, theme: themeByKey(themeKey).key } })
  },

  /**
   * Harvest a ripe crop: coins in (mutations multiply; companions add their
   * perks), mutations consumed, plant drops back one stage and regrows. The
   * plant is NEVER removed — multi-harvest forever (tone rule).
   */
  harvestGardenItem: async (id) => {
    const db = get().db
    if (!db) return
    const item = db.garden.items.find((i) => i.id === id)
    if (!item || !isHarvestable(item)) return
    let coins = harvestPayout(item, db.garden.bestStreak)
    let doubled = false
    if (
      db.garden.bestStreak >= 30 &&
      Math.random() < balance.garden.harvest.perks.doubleChanceAt30
    ) {
      coins *= 2
      doubled = true
    }
    const species = speciesByKey(item.theme, item.species)
    const garden = harvestItem(db.garden, id)
    await get().save({
      garden,
      player: { ...db.player, currency: db.player.currency + coins }
    })
    set({ harvestFlash: { coins, name: species?.name ?? 'crop', doubled } })
  },

  // ---- Arcade (v1.4) ---------------------------------------------------------
  spendArcadeTicket: async () => {
    const db = get().db
    if (!db || db.player.arcadeTickets <= 0) return false
    await get().save({ player: { ...db.player, arcadeTickets: db.player.arcadeTickets - 1 } })
    return true
  },

  /**
   * Cash out a round: coins = min(max, floor(score * rate)) from the game's
   * balance entry — a small bonus chest, never a coin farm (tickets only come
   * from completions). Bests only ever go UP.
   */
  finishArcadeRound: async (gameKey, score) => {
    const db = get().db
    if (!db) return { coins: 0, newBest: false }
    const cfg = balance.arcade.games[gameKey as keyof typeof balance.arcade.games]
    const coins = cfg ? Math.min(cfg.max, Math.max(0, Math.floor(score * cfg.rate))) : 0
    const prevBest = db.arcade.best[gameKey] ?? 0
    const newBest = score > prevBest
    await get().save({
      player: { ...db.player, currency: db.player.currency + coins },
      arcade: newBest ? { ...db.arcade, best: { ...db.arcade.best, [gameKey]: score } } : db.arcade
    })
    return { coins, newBest }
  },

  // ---- Focus timer ---------------------------------------------------------
  finishFocusSession: async () => {
    const db = get().db
    if (!db) return { coins: 0, capped: false }
    const today = todayStr()
    const { coinsPerSession, dailySessionCap } = balance.focus.reward
    const rewardedToday =
      db.focus.sessionsRewardedOn === today ? db.focus.sessionsRewardedCount : 0
    if (rewardedToday >= dailySessionCap) return { coins: 0, capped: true }
    const focus = { sessionsRewardedOn: today, sessionsRewardedCount: rewardedToday + 1 }
    await get().save({
      player: { ...db.player, currency: db.player.currency + coinsPerSession },
      focus
    })
    return { coins: coinsPerSession, capped: false }
  },

  // ---- Time frames ---------------------------------------------------------
  createTimeFrame: async (tf) => {
    const db = get().db
    if (!db) return
    const maxOrder = db.timeFrames.reduce((m, f) => Math.max(m, f.order), -1)
    const frame: TimeFrame = { ...tf, id: uid(), order: maxOrder + 1 }
    await get().save({ timeFrames: [...db.timeFrames, frame] })
  },

  updateTimeFrame: async (id, patch) => {
    const db = get().db
    if (!db) return
    const timeFrames = db.timeFrames.map((f) => (f.id === id ? { ...f, ...patch } : f))
    await get().save({ timeFrames })
  },

  deleteTimeFrame: async (id) => {
    const db = get().db
    if (!db) return
    // Move any quests in the removed frame to the first remaining frame so they
    // are never orphaned (and never lost — §10).
    const remaining = db.timeFrames.filter((f) => f.id !== id)
    const fallback = remaining[0]?.id
    const quests = fallback
      ? db.quests.map((q) => (q.timeFrameId === id ? { ...q, timeFrameId: fallback } : q))
      : db.quests
    await get().save({ timeFrames: remaining, quests })
  },

  moveTimeFrame: async (id, dir) => {
    const db = get().db
    if (!db) return
    const sorted = [...db.timeFrames].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((f) => f.id === id)
    const swap = idx + dir
    if (idx < 0 || swap < 0 || swap >= sorted.length) return
    ;[sorted[idx], sorted[swap]] = [sorted[swap], sorted[idx]]
    const timeFrames = sorted.map((f, i) => ({ ...f, order: i }))
    await get().save({ timeFrames })
  }
}))
