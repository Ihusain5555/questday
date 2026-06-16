import type { Database, TimeFrame } from './types'

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

export function createDefaultDatabase(): Database {
  return {
    version: DB_VERSION,
    quests: [],
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
      launchOnLogin: false,
      focusPreset: 'pomodoro',
      enabledFeatures: { focus: true, matrix: true },
      realmChronicle: []
    },
    townLayouts: {},
    lastSeenDate: null
  }
}
