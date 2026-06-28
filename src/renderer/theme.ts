// Theme + accent (v1.14). These are UI-ONLY preferences, so they live in localStorage
// (NOT db.json — same rule as the share-card style + arcade mute). Applied to <html> as
// data-theme / data-accent; the token overrides live in theme.css. The look was approved in
// mockups/theme-preview.html.
//
// Two independent axes:
//   • theme  : 'dusk' (dark, default) | 'daylight' (light) | 'system' (follow the OS)
//   • accent : 'emerald' (default) | 'amethyst' | 'sky' | 'gold'  (recolours --brand)
//
// Default is DUSK (not system) so existing users keep today's dark look until they opt in.

export type ThemeChoice = 'system' | 'dusk' | 'daylight'
export type AccentChoice = 'emerald' | 'amethyst' | 'sky' | 'gold'

export const ACCENTS: { id: AccentChoice; name: string; swatch: string }[] = [
  { id: 'emerald', name: 'Emerald', swatch: '#2fb380' },
  { id: 'amethyst', name: 'Amethyst', swatch: '#9d6ae0' },
  { id: 'sky', name: 'Sky', swatch: '#38a1ea' },
  { id: 'gold', name: 'Gold', swatch: '#efb43a' }
]
export const THEMES: { id: ThemeChoice; name: string; sub: string }[] = [
  { id: 'daylight', name: 'Daylight', sub: 'light' },
  { id: 'dusk', name: 'Dusk', sub: 'dark' },
  { id: 'system', name: 'System', sub: 'follow OS' }
]

const THEME_KEY = 'questday.theme'
const ACCENT_KEY = 'questday.accent'

export function loadThemeChoice(): ThemeChoice {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'dusk' || v === 'daylight' || v === 'system' ? v : 'dusk'
}
export function loadAccentChoice(): AccentChoice {
  const v = localStorage.getItem(ACCENT_KEY)
  return ACCENTS.some((a) => a.id === v) ? (v as AccentChoice) : 'emerald'
}

const prefersLight = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches

/** Resolve a choice to the concrete surface theme. */
export function resolveTheme(choice: ThemeChoice): 'dusk' | 'daylight' {
  return choice === 'system' ? (prefersLight() ? 'daylight' : 'dusk') : choice
}

interface ApplyOpts {
  /** When false (the floating widget / friction / prayer overlays, which are designed dark
   *  and sit over the desktop), the SURFACE theme is forced to dusk — but the accent still
   *  applies so the brand glow follows the user's pick. */
  allowLightTheme?: boolean
}

/** Apply the stored theme + accent to <html>. Call at the very top of each renderer entry
 *  (before createRoot) so there's no flash. */
export function applyStoredTheme(opts: ApplyOpts = {}): void {
  const allowLight = opts.allowLightTheme ?? true
  const root = document.documentElement
  root.dataset.theme = allowLight ? resolveTheme(loadThemeChoice()) : 'dusk'
  root.dataset.accent = loadAccentChoice()
}

/** Persist + apply a theme choice (from the Appearance picker). */
export function setThemeChoice(choice: ThemeChoice): void {
  localStorage.setItem(THEME_KEY, choice)
  document.documentElement.dataset.theme = resolveTheme(choice)
}
export function setAccentChoice(accent: AccentChoice): void {
  localStorage.setItem(ACCENT_KEY, accent)
  document.documentElement.dataset.accent = accent
}

/** Keep this window in sync when the theme changes in ANOTHER window (the picker writes
 *  localStorage → a 'storage' event fires in every OTHER window) or the OS scheme flips while
 *  on 'system'. Returns a cleanup fn. */
export function watchThemeChanges(opts: ApplyOpts = {}): () => void {
  const reapply = (): void => applyStoredTheme(opts)
  window.addEventListener('storage', reapply)
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  mql.addEventListener('change', reapply)
  return () => {
    window.removeEventListener('storage', reapply)
    mql.removeEventListener('change', reapply)
  }
}
