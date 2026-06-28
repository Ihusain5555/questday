// Playwright driver — Islamic observance calendar (v2). Two halves:
//   ENGINE self-checks (pure, deterministic — transpiles observances.ts):
//     FORBIDDEN_EIDS  — the next Eid al-Fitr / Eid al-Adha / Tashreeq days return 'forbidden'.
//     ARAFAH_ENCOURAGED — the next Day of Arafah returns 'encouraged'.
//     GUARDRAIL_YEAR  — over the next 365 days: fastingRuling==='forbidden' IFF it's a real
//                       forbidden day, AND no forbidden day ever surfaces a recommended fast.
//                       (The load-bearing "never suggest fasting on a forbidden day" rule.)
//   APP/UI checks:
//     ISOLATION       — userData IS the temp dir.
//     TAB_VISIBLE     — the Calendar tab shows when the feature is on.
//     HIJRI_SHOWS     — today's Hijri date renders ("… AH").
//     NOTIFY_TOGGLE   — the on-device notification toggle persists to settings.
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

const out = path.join(tmpdir(), 'qd-obs.mjs')
buildSync({ entryPoints: ['src/shared/engine/observances.ts'], outfile: out, format: 'esm', bundle: true, logLevel: 'error', absWorkingDir: root })
const { hijriDate, fastingRuling, observancesOn, forbiddenFastReason } = await import(pathToFileURL(out).href)

const today = new Date()
const dayAt = (i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
const findDay = (pred) => {
  for (let i = 0; i < 400; i++) {
    const d = dayAt(i)
    if (pred(d)) return d
  }
  return null
}

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}

// === ENGINE self-checks =====================================================
const eidFitr = findDay((d) => { const h = hijriDate(d); return h.month === 10 && h.day === 1 })
const eidAdha = findDay((d) => { const h = hijriDate(d); return h.month === 12 && h.day === 10 })
const tashreeq = findDay((d) => { const h = hijriDate(d); return h.month === 12 && h.day >= 11 && h.day <= 13 })
result('FORBIDDEN_EIDS',
  eidFitr && eidAdha && tashreeq &&
    fastingRuling(eidFitr).ruling === 'forbidden' &&
    fastingRuling(eidAdha).ruling === 'forbidden' &&
    fastingRuling(tashreeq).ruling === 'forbidden',
  `fitr=${eidFitr && ymd(eidFitr)} adha=${eidAdha && ymd(eidAdha)} tashreeq=${tashreeq && ymd(tashreeq)}`)

const arafah = findDay((d) => { const h = hijriDate(d); return h.month === 12 && h.day === 9 })
result('ARAFAH_ENCOURAGED', arafah && fastingRuling(arafah).ruling === 'encouraged', `arafah=${arafah && ymd(arafah)}`)

// The whole-year invariant — the guardrail must hold every single day.
let mismatches = 0
let fastOnForbidden = 0
let forbiddenCount = 0
for (let i = 0; i < 365; i++) {
  const d = dayAt(i)
  const forbidden = forbiddenFastReason(d) != null
  const ruling = fastingRuling(d).ruling
  if (forbidden) forbiddenCount++
  if ((ruling === 'forbidden') !== forbidden) mismatches++
  if (forbidden && observancesOn(d).some((o) => o.category === 'fast' || o.fasting === 'encouraged')) fastOnForbidden++
}
result('GUARDRAIL_YEAR', mismatches === 0 && fastOnForbidden === 0,
  `forbiddenDays=${forbiddenCount} ruleMismatches=${mismatches} fastSuggestedOnForbidden=${fastOnForbidden}`)

// === APP / UI checks ========================================================
const seed = {
  version: 1,
  quests: [],
  timeFrames: [{ id: 'tf-day', name: 'Day', startMinute: 0, endMinute: 1439, order: 0 }],
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings: { enabledFeatures: { focus: true, matrix: true, observanceCalendar: true }, observanceNotify: false },
  townLayouts: {},
  questTemplates: [],
  questBundles: [],
  dailyNotes: {},
  lastSeenDate: ymd(today)
}

const dir = path.join(tmpdir(), 'questday-iso-observances')
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

  const calTab = main.getByRole('button', { name: 'Calendar', exact: true })
  result('TAB_VISIBLE', (await calTab.count()) === 1)
  await calTab.click()
  await main.waitForSelector('.calendar-view', { timeout: 5000 })
  await main.waitForTimeout(300)

  const hijriText = (await main.locator('.cal-hijri-date').textContent()) ?? ''
  result('HIJRI_SHOWS', /\bAH\b/.test(hijriText), `text="${hijriText.trim()}"`)
  await main.screenshot({ path: path.join(shots, 'observances.png') })

  await main.locator('.cal-notify input[type="checkbox"]').click()
  await main.waitForTimeout(600)
  result('NOTIFY_TOGGLE', readDb().settings.observanceNotify === true, `notify=${readDb().settings.observanceNotify}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
