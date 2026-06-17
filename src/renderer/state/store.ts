import { create } from 'zustand'
import type {
  Database,
  DatabasePatch,
  PlotOverride,
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
import { totalCompletions, totalXpEarned } from '@shared/engine/stats'
import { claimableNow, normalizeChronicle, claimsAvailable, allRegions } from '@shared/engine/realm'
import { buildingsForXp, civProgress } from '@shared/engine/civilization'

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
  /** Expeditions (region claims) ready to spend after this completion — the reward
   *  artifact prompt — or null when none are available / the realm is fully charted. */
  expedition?: number | null
  /** Civilization growth surfaced from the DEFAULT view (v1.10). `grewBuildings` is set
   *  only when this completion's XP raised the town's building count (the gains-only
   *  milestone beat); otherwise `toNext` (XP) / `percent` drive a "progress to your next
   *  building" line. Purely DERIVED from before/after all-time XP — never persisted, so
   *  ↩ Restore (exact XP claw-back) stays exact. null when the `world` feature is off. */
  civ?: {
    stageName: string
    grewBuildings: number | null
    toNext: number | null
    percent: number
    /** True once the town is at its building cap — surfaces a "stands in full glory"
     *  beat instead of growth/progress (gains-only: a maxed town still celebrates). */
    atCap: boolean
  } | null
}

/** Transient harvest payout flash (local to the harvesting window). */
export interface HarvestFlash {
  coins: number
  name: string
  doubled: boolean
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
  /** Set when a save fails to persist (e.g. transient file lock); null when healthy.
   *  The last-good state is kept, so the UI can prompt a retry without losing data. */
  saveError: string | null
  clearSaveError: () => void

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
  /** Spend an expedition to chart a chosen region, learning a chosen topic's entry. */
  claimRegion: (regionId: string, topicId: string, entryId: string) => Promise<void>

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

  // ---- Town editing (v1.10) ----
  /** Persist a town's arrangement (the sealed override layer). Pass the FULL
   *  overrides map for that town; an EMPTY map removes the town's entry (= reset to
   *  auto-layout). townLayouts is a wholesale-replace key, so the whole map is sent.
   *  Never feeds the XP-derived building count, so ↩ Restore stays exact. */
  saveTownLayout: (townId: string, overrides: Record<number, PlotOverride>) => Promise<void>

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
  /** End a round: records a new best (high-score only — coins removed). */
  finishArcadeRound: (gameKey: string, score: number) => Promise<{ newBest: boolean }>

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
  saveError: null,

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
    try {
      const db = await window.questday.saveState(patch)
      set({ db, saveError: null })
    } catch (err) {
      // A failed/rejected save (disk lock, or a rejected invalid patch) must not
      // become an invisible unhandled rejection. Keep the last-good state and flag it.
      console.error('[questday] save failed; keeping last-good state:', err)
      set({ saveError: 'Could not save your latest change. Please try again.' })
    }
  },
  clearSaveError: () => set({ saveError: null }),

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
    const today = ymd(new Date())
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
    // NOTE (v1.8): growOnCompletion's stage bump is the PROTECTED inert state —
    // kept so ↩ Restore's reversibility math stays valid (do not remove). The
    // `grew`/`mutation` fields packed into the celebration below are computed but
    // NOT currently rendered — the Realm-era CompletionCelebration ignores them.
    // Left in place only in case the garden is un-retired; unconsumed until then.
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

    // A completed quest earns one expedition — a claim the user spends by choosing
    // any unexplored region to chart (settings.realmClaimed). Gains-only; Restore
    // trims the newest claim to match.
    const expeditions = claimableNow(totalCompletions(quests), db.settings.realmChronicle ?? [])

    // Civilization (v1.10): finishing a quest grows the town, surfaced right here in the
    // default-view celebration. Buildings track ALL-TIME XP (effort-weighted), not raw
    // completion count: `before` = buildings from XP PRE-this-completion (db.player),
    // `after` = POST (award.newPlayer already includes this XP). A delta > 0 is the
    // gains-only milestone beat ("a new building rose"); otherwise we show XP remaining to
    // the next building. The stage NAME still labels the era. PURE-DERIVED from XP + gated
    // by the `world` toggle + nothing persisted, so the town (and this line) walk back
    // exactly on ↩ Restore (which claws XP back exactly).
    const worldOn = db.settings.enabledFeatures?.world !== false
    const before = buildingsForXp(totalXpEarned(db.player))
    const after = buildingsForXp(totalXpEarned(award.newPlayer))
    const prog = civProgress(totalCompletions(quests))
    const civ = worldOn
      ? {
          stageName: prog.stageName,
          grewBuildings: after.count > before.count ? after.count - before.count : null,
          toNext: after.atCap ? null : after.toNextXp,
          percent: after.percent,
          atCap: after.atCap
        }
      : null

    await get().save({ quests, player, garden, arcade })
    set({
      celebration: {
        award,
        questTitle: quest.title,
        grew,
        mutation,
        ticket,
        expedition: expeditions > 0 ? expeditions : null,
        civ
      }
    })
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

    // Coins were removed (v1.8.2): completionAward.currency is always 0, so there
    // is nothing to claw back — the XP/level rollback above IS the live reversal.
    // Currency and the (inert) garden pass through unchanged. The currency field
    // is retained only for save-compat.
    const currency = db.player.currency
    const garden = db.garden

    const quests = db.quests.map((q) =>
      q.id === id
        ? {
            ...q,
            status: 'active' as const,
            completedAt: null,
            completionAward: undefined,
            subTasks: q.subTasks.map((s) => ({ ...s, done: false })),
            // A restored recurring completion REMOVES today's date from the
            // history so totalCompletions drops by exactly one. This is
            // load-bearing for the normalizeChronicle() trim below — it's what
            // keeps Restore an EXACT reversal of the realm reward.
            completionDates: q.completionDates?.filter((d) => d !== ymd(new Date()))
          }
        : q
    )
    // Restoring removes a completion, so trim the newest Chronicle discovery if it
    // now exceeds earned expeditions (mirrors the exact reversal — gains-only).
    const realmChronicle = normalizeChronicle(totalCompletions(quests), db.settings.realmChronicle ?? [])

    await get().save({
      quests,
      player: { ...db.player, xp, level, currency },
      garden,
      // Only the changed field — settings deep-merges in the store.
      settings: { realmChronicle }
    })
  },

  claimRegion: async (regionId, topicId, entryId) => {
    const db = get().db
    if (!db) return
    const chronicle = db.settings.realmChronicle ?? []
    if (chronicle.some((r) => r.region === regionId)) return
    if (!allRegions().some((r) => r.id === regionId)) return
    if (claimsAvailable(totalCompletions(db.quests), chronicle.length) < 1) return
    await get().save({
      settings: {
        realmChronicle: [...chronicle, { region: regionId, topic: topicId, entry: entryId }]
      }
    })
  },

  clearCelebration: () => set({ celebration: null }),
  clearHarvestFlash: () => set({ harvestFlash: null }),
  clearDewNews: () => set({ dewNews: null }),

  // ---- Daily rollover ------------------------------------------------------
  runDayChange: async () => {
    const db = get().db
    if (!db) return null
    const now = new Date()
    const today = ymd(now)

    // Daily free brain-breaks: on the first open of a new day (or first launch
    // after this feature shipped), top arcade tickets UP TO the free floor —
    // never stacking — so the beneficial arcade is always playable, even on a
    // zero-quest day. Questing then adds more on top. Tone rule: only ever grants.
    const needFree = db.arcade.freeGrantedOn !== today
    const player = needFree
      ? { ...db.player, arcadeTickets: Math.max(db.player.arcadeTickets, balance.arcade.ticketsFreePerDay) }
      : db.player
    const arcade = needFree ? { ...db.arcade, freeGrantedOn: today } : db.arcade

    const change = computeDayChange(db, now)
    if (!change) {
      if (needFree) await get().save({ player, arcade })
      return null
    }

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

    await get().save({ quests, garden, player, arcade, lastSeenDate: today })
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
    // Send ONLY the changed fields; saveDatabase deep-merges settings, so this can't
    // clobber a sibling (e.g. widgetBounds written by the main process) from a stale snapshot.
    await get().save({ settings: patch })
  },

  // ---- Town editing (v1.10) -------------------------------------------------
  saveTownLayout: async (townId, overrides) => {
    const db = get().db
    if (!db) return
    // townLayouts is a wholesale-replace key — send the FULL map. An empty overrides
    // map removes the town (reset to auto-layout); deep-merge couldn't delete a key.
    const next = { ...db.townLayouts }
    if (Object.keys(overrides).length > 0) next[townId] = { overrides }
    else delete next[townId]
    await get().save({ townLayouts: next })
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
    if (!dailyStock(db.garden.theme, ymd(new Date())).has(species.key)) return
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
    if (!db) return { newBest: false }
    const hadBest = db.arcade.best[gameKey] !== undefined
    const prevBest = db.arcade.best[gameKey] ?? 0
    const improved = score > prevBest
    // Record the first-ever round even if it scored 0, so a completed round stops
    // reading as "no rounds yet". Once a best exists, only improvements update it.
    if (!hadBest || improved) {
      const best = hadBest ? Math.max(score, prevBest) : score
      await get().save({ arcade: { ...db.arcade, best: { ...db.arcade.best, [gameKey]: best } } })
    }
    // "New best" celebration only fires on an actual improvement (a first 0 isn't one).
    return { newBest: improved }
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
