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
  /** Must match the tab id in App.tsx. */
  id: string
  emoji: string
  label: string
  /** One-line "what is this?" — doubles as the explainer in settings. */
  blurb: string
}

export const TOGGLEABLE_FEATURES: ToggleableFeature[] = [
  {
    id: 'focus',
    emoji: '⏱️',
    label: 'Focus timer',
    blurb: 'Pomodoro, 52/17, deep-work, or Flowtime focus sessions tied to your current quest.'
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
