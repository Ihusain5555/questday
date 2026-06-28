import type { Database, Quest, TimeFrame } from './types'

export const DB_VERSION = 1

/** Default daily cycle (§5). Night wraps past midnight (start > end). */
export function createDefaultTimeFrames(): TimeFrame[] {
  return [
    { id: 'tf-morning', name: 'Morning', startMinute: 5 * 60, endMinute: 12 * 60, order: 0 },
    { id: 'tf-midday', name: 'Midday', startMinute: 12 * 60, endMinute: 17 * 60, order: 1 },
    { id: 'tf-evening', name: 'Evening', startMinute: 17 * 60, endMinute: 21 * 60, order: 2 },
    { id: 'tf-night', name: 'Night', startMinute: 21 * 60, endMinute: 5 * 60, order: 3 }
  ]
}

/**
 * First-run "starter day" (v1.13). A brand-new install lands on a few friendly example
 * quests instead of an empty app — they teach the core loop (complete a quest, quick-add
 * your own) and are ordinary, deletable quests. Seeded ONLY in createDefaultDatabase, so a
 * fresh file gets them once; deleting them is permanent (migrate keeps existing []), and
 * the pw drivers write their own seeds, so they're never affected. Easy + ~10 min = a
 * gentle 2 XP each (XP is derived from the time estimate — see rewards.ts).
 */
export function createStarterQuests(): Quest[] {
  const createdAt = new Date().toISOString()
  const base = {
    subTasks: [],
    difficulty: 'Easy' as const,
    importance: 'Medium' as const,
    urgency: 'Medium' as const,
    timeEstimateMinutes: 10,
    dueAt: null,
    status: 'active' as const,
    createdAt,
    completedAt: null
  }
  return [
    {
      ...base,
      id: 'starter-welcome',
      title: 'Welcome to QuestDay! Complete me to see your realm grow 🎉',
      timeFrameId: 'tf-morning',
      sortOrder: 0,
      subTasks: [{ id: 'starter-welcome-s1', title: 'Tap this step to check it off', order: 0, done: false }]
    },
    {
      ...base,
      id: 'starter-quickadd',
      title: 'Add your own quest — type a title up top and press Enter',
      timeFrameId: 'tf-morning',
      sortOrder: 1
    },
    {
      ...base,
      id: 'starter-plan',
      title: 'Plan your day: pick your top 3 things to get done',
      timeFrameId: 'tf-midday',
      sortOrder: 2
    }
  ]
}

export function createDefaultDatabase(): Database {
  return {
    version: DB_VERSION,
    quests: createStarterQuests(),
    timeFrames: createDefaultTimeFrames(),
    player: {
      xp: 0,
      level: 1,
      currency: 0,
      streakCount: 0,
      lastCompletionDate: null,
      arcadeTickets: 0
    },
    garden: {
      theme: 'garden',
      items: [],
      visitors: [],
      bestStreak: 0
    },
    arcade: {
      best: {},
      ticketsEarnedOn: null,
      ticketsEarnedCount: 0,
      freeGrantedOn: null
    },
    settings: {
      activeModeEnabled: false,
      activeModeTiers: {
        awareness: true,
        nudge: false,
        softFriction: false,
        hardBlock: false
      },
      distractingApps: [],
      reminderIntervalMin: 30,
      frameEndingLeadMin: 10,
      nudgeSnoozeMin: 15,
      blockBreakPassMin: 5,
      widgetBounds: null,
      widgetExpanded: false,
      widgetVisible: true,
      pinnedQuestId: null,
      // Prayer reminder OFF by default — a faith feature is opt-in only (see faithChecklist note).
      prayerReminderEnabled: false,
      // Observance notifications OFF by default — opt-in faith feature (v2).
      observanceNotify: false,
      observanceLastNotified: null,
      launchOnLogin: false,
      focusPreset: 'pomodoro',
      // faithChecklist + observanceCalendar seeded false: a faith feature must be OFF until
      // opted in (the generic "missing key = on" rule is deliberately overridden by this seed,
      // which migrate() merges fresh-first so existing saves inherit it too) so non-Muslim
      // users never see it.
      enabledFeatures: { focus: true, matrix: true, faithChecklist: false, observanceCalendar: false },
      realmChronicle: [],
      // Prayer-time settings (v1.12). No location until the user picks a city, so
      // the Salah setup card prompts for one before seeding timed quests. Never
      // read by rewards/civilization → ↩ Restore exact.
      prayerTimes: { cityId: null, lat: null, lon: null, method: 'isna', asr: 'standard' }
    },
    townLayouts: {},
    questTemplates: [],
    dailyNotes: {},
    lastSeenDate: null
  }
}
