// ---------------------------------------------------------------------------
// Toggleable productivity features. ONE registry, read by both the tab bar
// (App.tsx — show/hide the tab) and the Data tab's Productivity section
// (DataView.tsx — the on/off switch + explainer). Adding a future feature
// (Eisenhower matrix, time-blocking) = one entry here + one tab in App.tsx.
//
// Default is ON: a missing key in settings.enabledFeatures means visible, so
// existing users discover new tools instead of hunting for a hidden switch.
// ---------------------------------------------------------------------------

export interface ToggleableFeature {
  /** Matches a tab id in App.tsx, OR a sub-section flag read directly via
   *  isFeatureEnabled (e.g. 'questLibrary' — a rail inside the Quests tab, not
   *  its own tab). */
  id: string
  /** Phosphor icon name (mapped to a component in DataView) — matches the tab
   *  icon in App.tsx so the toggle list and the tab read identically. */
  icon: string
  label: string
  /** One-line "what is this?" — doubles as the explainer in settings. */
  blurb: string
}

export const TOGGLEABLE_FEATURES: ToggleableFeature[] = [
  {
    id: 'focus',
    icon: 'Timer',
    label: 'Focus timer',
    blurb: 'Pomodoro, 52/17, deep-work, or Flowtime focus sessions tied to your current quest.'
  },
  {
    id: 'matrix',
    icon: 'Compass',
    label: 'Eisenhower matrix',
    blurb: 'Triage your quests in the urgent × important 2×2, by the importance and urgency you set on each quest — see where your effort should go.'
  },
  {
    // The Realm reward world (tab id 'world'). Toggle hides the tab only — every
    // charted discovery is kept (gains-only), so flipping it back restores them.
    id: 'world',
    icon: 'MapTrifold',
    label: 'Realm',
    blurb: 'Your reward world — an explorable map that charts a new region each time you finish a quest.'
  },
  {
    // A sub-section, NOT a tab: the Library rail lives INSIDE the Quests tab, so
    // no tab id matches 'questLibrary' (App.tsx's tab filter never hides a tab).
    // QuestsView reads isFeatureEnabled directly to show/hide the rail; toggling
    // off only hides it — saved templates are kept on disk (gains-only).
    id: 'questLibrary',
    icon: 'Books',
    label: 'Quest Library',
    blurb: 'Save reusable quest templates (your work-day / gym-day things) and tap or drag them into today.'
  },
  {
    // A faith feature — OFF by default (seeded false in defaults.ts; the generic
    // "missing key = on" rule is deliberately overridden by that seed) so non-Muslim
    // users never see it. Like questLibrary it's a SUB-SECTION, not a tab: a calm
    // setup card inside the Quests tab, read via isFeatureEnabled — App.tsx's tab
    // filter never matches this id.
    id: 'faithChecklist',
    icon: 'Mosque',
    label: 'Salah & Qur’an checklist',
    blurb:
      'An optional, private daily checklist for the five prayers and Qur’an reading. You only ever tick what you’ve done — nothing is ever counted against you. Off by default.'
  },
  {
    // A faith TAB (id matches the App.tsx tab) — OFF by default (seeded false in defaults.ts)
    // so non-Muslim users never see it. The Hijri date + observance calendar; all computed
    // on-device, and it never suggests fasting on a forbidden day.
    id: 'observanceCalendar',
    icon: 'CalendarStar',
    label: 'Islamic calendar',
    blurb:
      'The Hijri date and a calendar of Islamic observances (Eids, Ashura, Arafah, Ramadan, the White Days), computed privately on your device. Optional gentle reminders. Off by default.'
  },
  {
    // A Dashboard recap CARD, not a tab — read via isFeatureEnabled (App.tsx's tab
    // filter never matches this id). Default ON (missing key = on), so no defaults
    // seed is needed; users can hide it from the Data tab.
    id: 'weeklyReview',
    icon: 'CalendarCheck',
    label: 'Weekly review',
    blurb:
      'A calm weekly recap on the Dashboard — your completions, best day, and power hour. Pure celebration, never targets or misses.'
  },
  {
    // A Dashboard reflection CARD, not a tab — read via isFeatureEnabled. Default ON
    // (missing key = on). A calm once-a-day "how did today go?" note; never a target.
    id: 'endOfDayNote',
    icon: 'PencilSimple',
    label: 'End-of-day reflection',
    blurb:
      'A calm daily wind-down on the Dashboard — jot one line about how today went. Optional, private, never counted against you.'
  }
]

const FEATURE_IDS = new Set(TOGGLEABLE_FEATURES.map((f) => f.id))

/** True for tabs that aren't gated by a feature toggle (always visible). */
export function isCoreTab(tabId: string): boolean {
  return !FEATURE_IDS.has(tabId)
}

/** A feature is on unless explicitly set to false (missing key = on). */
export function isFeatureEnabled(
  enabled: Record<string, boolean> | undefined,
  id: string
): boolean {
  return enabled?.[id] !== false
}
