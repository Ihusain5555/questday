// Playwright driver — prayer-AWARE time frames (v2 faith layer). Drives the REAL app
// (built out/) in an isolated --user-data-dir (the real db.json is NEVER touched) and
// verifies the feature end-to-end. Two halves:
//   ENGINE self-checks (pure, deterministic — transpiles the engine and asserts math):
//     RESOLVE_SHIFT  — a both-sides-anchored frame's window == today's prayer minutes.
//     END_OMITTED    — LEGACY prayerAnchor with no `end` runs until the NEXT point (migration path).
//     MIXED          — v2.1: start prayer + end clock (and vice-versa) each resolve independently.
//     FALLBACK       — no location → anchored frame keeps its saved clock minutes.
//   APP/UI checks (launch + drive + read db.json back):
//     ISOLATION      — userData IS the temp dir (real db.json untouched).
//     DB_ACCEPTS     — seeded startAnchor/endAnchor survive migrate()+validate() on launch.
//     UI_PICKERS     — the anchored row shows 2 prayer selects with the seeded values.
//     TOGGLE_CLOCK   — clicking a side's Clock seg clears that side's anchor → a MIXED frame.
//     TOGGLE_PRAYER  — clicking a side's Prayer seg on a clock frame writes that side's anchor.
//     ACTIVE_NOW     — if now is inside the resolved window, the row shows "active now"
//                      (proves the wiring; SKIP, never FAIL, when run outside the window).
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { buildSync } from 'esbuild'
import { pathToFileURL } from 'url'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const CITY = { id: 'detroit', lat: 42.33, lon: -83.05 } // must exist in cities.ts

// --- transpile the engines so we can compute EXPECTED values to compare against ---
const bundle = (entry, name) => {
  const out = path.join(tmpdir(), name)
  buildSync({ entryPoints: [entry], outfile: out, format: 'esm', bundle: true, logLevel: 'error', absWorkingDir: root })
  return import(pathToFileURL(out).href)
}
const { computePrayerDay, localTzHours } = await bundle('src/shared/engine/prayerTimes.ts', 'qd-pt.mjs')
const { effectiveTimeFrames } = await bundle('src/shared/engine/prayerFrames.ts', 'qd-pf.mjs')

const now = new Date()
const day = computePrayerDay({
  lat: CITY.lat,
  lon: CITY.lon,
  date: now,
  tzHours: localTzHours(now),
  method: 'isna',
  asr: 'standard'
})
const minOf = (d) => d.getHours() * 60 + d.getMinutes()
const exp = { fajr: minOf(day.fajr), dhuhr: minOf(day.dhuhr), asr: minOf(day.asr), isha: minOf(day.isha) }

// Frames: an anchored "Deep work" (Fajr→Isha; clock fallback 08:00–17:00) + a plain Night.
const frames = [
  { id: 'tf-anchored', name: 'Deep work', startMinute: 480, endMinute: 1020, order: 0, startAnchor: 'fajr', endAnchor: 'isha' },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 1 }
]
const settingsForEngine = { prayerTimes: { cityId: CITY.id, lat: CITY.lat, lon: CITY.lon, method: 'isna', asr: 'standard' } }

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}
const skip = (name, why) => console.log(`${name}: SKIP (${why})`)

// === ENGINE self-checks (no app) ===========================================
const resolved = effectiveTimeFrames(frames, settingsForEngine, now)
const ra = resolved.find((f) => f.id === 'tf-anchored')
result('RESOLVE_SHIFT', ra.startMinute === exp.fajr && ra.endMinute === exp.isha,
  `start=${ra.startMinute}(want ${exp.fajr}) end=${ra.endMinute}(want ${exp.isha})`)

const omit = effectiveTimeFrames(
  [{ id: 'x', name: 'x', startMinute: 0, endMinute: 1, order: 0, prayerAnchor: { start: 'dhuhr' } }],
  settingsForEngine,
  now
)[0]
result('END_OMITTED', omit.startMinute === exp.dhuhr && omit.endMinute === exp.asr,
  `start=${omit.startMinute}(want ${exp.dhuhr}) end=${omit.endMinute}(want ${exp.asr})`)

// MIXED (v2.1): each side independent — prayer start + clock end, and clock start + prayer end.
const mixStart = effectiveTimeFrames(
  [{ id: 'ms', name: 'ms', startMinute: 600, endMinute: 1020, order: 0, startAnchor: 'fajr' }],
  settingsForEngine,
  now
)[0]
const mixEnd = effectiveTimeFrames(
  [{ id: 'me', name: 'me', startMinute: 600, endMinute: 1020, order: 0, endAnchor: 'asr' }],
  settingsForEngine,
  now
)[0]
result('MIXED',
  mixStart.startMinute === exp.fajr && mixStart.endMinute === 1020 &&
  mixEnd.startMinute === 600 && mixEnd.endMinute === exp.asr,
  `prayer→clock: ${mixStart.startMinute}/${mixStart.endMinute} (want ${exp.fajr}/1020); ` +
  `clock→prayer: ${mixEnd.startMinute}/${mixEnd.endMinute} (want 600/${exp.asr})`)

const noLoc = effectiveTimeFrames(frames, { prayerTimes: { cityId: null, lat: null, lon: null, method: 'isna', asr: 'standard' } }, now)
const na = noLoc.find((f) => f.id === 'tf-anchored')
result('FALLBACK', na.startMinute === 480 && na.endMinute === 1020, `start=${na.startMinute} end=${na.endMinute}`)

// is "now" inside the resolved anchored window? (for the conditional ACTIVE_NOW UI check)
const isActive = (() => {
  const m = minOf(now)
  const s = ra.startMinute
  const e = ra.endMinute
  return s <= e ? m >= s && m < e : m >= s || m < e
})()

// === APP / UI checks ========================================================
const seed = {
  version: 1,
  quests: [],
  timeFrames: frames,
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings: {
    enabledFeatures: { focus: true, matrix: true },
    prayerTimes: { cityId: CITY.id, lat: CITY.lat, lon: CITY.lon, method: 'isna', asr: 'standard' }
  },
  townLayouts: {},
  questTemplates: [],
  dailyNotes: {},
  lastSeenDate: ymd(now)
}

const dir = path.join(tmpdir(), 'questday-iso-prayer-frames')
mkdirSync(dir, { recursive: true })
const dbPath = path.join(dir, 'db.json')
const readDb = () => JSON.parse(readFileSync(dbPath, 'utf-8'))
writeFileSync(dbPath, JSON.stringify(seed, null, 2))

const launch = async () => {
  const a = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await a.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  return a
}

let app
try {
  app = await launch()
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  // DB_ACCEPTS: the seeded per-side anchors survived migrate()+validate() on launch.
  const after = readDb().timeFrames.find((f) => f.id === 'tf-anchored')
  result('DB_ACCEPTS', after?.startAnchor === 'fajr' && after?.endAnchor === 'isha',
    `anchors=${after?.startAnchor}/${after?.endAnchor}`)

  // Open the Time frames tab.
  await main.getByRole('button', { name: 'Time frames', exact: true }).click()
  await main.waitForSelector('.tf-item', { timeout: 5000 })
  await main.waitForTimeout(300)
  const rows = main.locator('.tf-item')
  const anchoredRow = rows.nth(0)
  const nightRow = rows.nth(1)

  // UI_PICKERS: both sides prayer-anchored → two prayer selects with the seeded values.
  const selects = anchoredRow.locator('.tf-prayer-select')
  const selCount = await selects.count()
  const v0 = selCount > 0 ? await selects.nth(0).inputValue() : ''
  const v1 = selCount > 1 ? await selects.nth(1).inputValue() : ''
  result('UI_PICKERS', selCount === 2 && v0 === 'fajr' && v1 === 'isha',
    `selects=${selCount} v0=${v0} v1=${v1}`)
  await main.screenshot({ path: path.join(shots, 'prayer-frames.png') })

  // ACTIVE_NOW (conditional): the row shows "active now" iff now ∈ the resolved window.
  if (isActive) {
    const badge = await anchoredRow.locator('.badge.active-now').count()
    result('ACTIVE_NOW', badge === 1, `badge=${badge} (now is inside Fajr→Isha)`)
  } else {
    skip('ACTIVE_NOW', 'now is outside the Fajr→Isha window (e.g. late night)')
  }

  // TOGGLE_CLOCK: set the START side of the anchored row to a clock time (its first toggle
  // group, first seg = clock) → a MIXED frame: startAnchor cleared, endAnchor still isha.
  await anchoredRow.locator('.tf-anchor-toggle').nth(0).locator('.tf-seg').nth(0).click()
  await main.waitForTimeout(600)
  const clk = readDb().timeFrames.find((f) => f.id === 'tf-anchored')
  const startTime = await anchoredRow.locator('input.tf-time').count()
  result('TOGGLE_CLOCK', clk.startAnchor == null && clk.endAnchor === 'isha' && startTime === 1,
    `startAnchor=${clk.startAnchor} endAnchor=${clk.endAnchor} timeInputs=${startTime}`)

  // TOGGLE_PRAYER: set the START side of the (clock) Night row to a prayer (its first toggle
  // group, second seg = prayer) → startAnchor written, end stays clock (a MIXED prayer→clock).
  await nightRow.locator('.tf-anchor-toggle').nth(0).locator('.tf-seg').nth(1).click()
  await main.waitForTimeout(600)
  const nf = readDb().timeFrames.find((f) => f.id === 'tf-night')
  result('TOGGLE_PRAYER', nf.startAnchor === 'fajr' && nf.endAnchor == null,
    `startAnchor=${nf.startAnchor} endAnchor=${nf.endAnchor}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
