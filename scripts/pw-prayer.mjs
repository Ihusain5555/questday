// Playwright driver — prayer-time Salah quests (v1.12). Drives the REAL app
// (built out/) in an isolated --user-data-dir (the real db.json is NEVER touched)
// and verifies the whole feature end-to-end.
//   ISOLATION        — userData IS the temp dir.
//   NO_LOCATION_GUARD— feature ON but no city set → card shows guidance, NO Add button.
//   SET_CITY_UI      — picking a city in the Data-tab PrayerSettings persists lat/lon.
//   ADD_CREATES      — Add → exactly 6 quests (Fajr/Dhuhr/Asr/Maghrib/Isha + Qur'an).
//   GENTLE_FIELDS    — 5 prayers Easy/Med/Low, 5 min, recurs all 7 days, no subtasks.
//   DUE_TIMES        — each prayer's dueAt matches the engine's window-close time (±1 min).
//   CARD_FLIPS       — after adding, the card shows "Added." and the Add button is gone.
//   NO_DUP           — leave & return → still exactly 6 (idempotent by title).
//   DAILY_RECOMPUTE  — relaunch on a NEW day (lastSeenDate=yesterday, dueAt faked old)
//                      → prayer quests' dueAt is restamped to TODAY's times.
//   TOGGLE_OFF_KEEPS_DATA — toggle OFF hides the card; the 6 quests REMAIN on disk.
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

// MUST match src/renderer/state/store.ts.
const QURAN = 'Read Qur’an'
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const DUE_KEY = { Fajr: 'fajr', Dhuhr: 'dhuhr', Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha' }
const CITY = { id: 'detroit', lat: 42.33, lon: -83.05 } // must exist in cities.ts

// Transpile the prayer engine so we can compute the EXPECTED due-times to compare
// against what the app wrote (proves the store wired the engine correctly).
const engOut = path.join(tmpdir(), 'questday-pt-eng.mjs')
buildSync({
  entryPoints: ['src/shared/engine/prayerTimes.ts'],
  outfile: engOut,
  format: 'esm',
  logLevel: 'error',
  absWorkingDir: root
})
const { computePrayerDay, localTzHours } = await import(pathToFileURL(engOut).href)
const expectedDay = (date) =>
  computePrayerDay({
    lat: CITY.lat,
    lon: CITY.lon,
    date,
    tzHours: localTzHours(date),
    method: 'isna',
    asr: 'standard'
  })

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

// Mirror store.frameForTime — the frame whose window contains a prayer's time.
const frameForTime = (date) => {
  const minute = date.getHours() * 60 + date.getMinutes()
  const ordered = [...frames].sort((a, b) => a.order - b.order)
  const hit = ordered.find((f) =>
    f.startMinute <= f.endMinute
      ? minute >= f.startMinute && minute < f.endMinute
      : minute >= f.startMinute || minute < f.endMinute
  )
  return (hit ?? ordered[0]).id
}

// Feature ON, but NO location yet (lat/lon null) — exercises the guard.
const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro',
  enabledFeatures: { focus: true, matrix: true, world: true, questLibrary: false, faithChecklist: true },
  prayerTimes: { cityId: null, lat: null, lon: null, method: 'isna', asr: 'standard' },
  realmChronicle: []
}

const seed = (lastSeen) => ({
  version: 1,
  quests: [],
  timeFrames: frames,
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: lastSeen
})

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}

const dir = path.join(tmpdir(), 'questday-iso-prayer')
mkdirSync(dir, { recursive: true })
const dbPath = path.join(dir, 'db.json')
const readDb = () => JSON.parse(readFileSync(dbPath, 'utf-8'))
const writeDb = (db) => writeFileSync(dbPath, JSON.stringify(db, null, 2))
writeDb(seed(ymd(new Date())))

const launch = async () => {
  const a = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await a.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  return a
}

let app
try {
  app = await launch()
  let main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  // --- NO_LOCATION_GUARD: feature on, no city → guidance, no Add button ---
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.faith-card', { timeout: 5000 })
  await main.waitForTimeout(300)
  const addBefore = await main.getByRole('button', { name: 'Add to my quests' }).count()
  const guidance = (await main.locator('.faith-card').textContent()) ?? ''
  result('NO_LOCATION_GUARD', addBefore === 0 && /city/i.test(guidance),
    `addBtn=${addBefore} mentionsCity=${/city/i.test(guidance)}`)
  await main.locator('.faith-card').screenshot({ path: path.join(shots, 'prayer-no-location.png') })

  // --- SET_CITY_UI: pick Detroit in Data → PrayerSettings ---
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForSelector('#ps-city', { timeout: 5000 })
  await main.locator('#ps-city').selectOption(CITY.id)
  await main.waitForTimeout(700)
  const pt = readDb().settings.prayerTimes
  result('SET_CITY_UI', pt.cityId === CITY.id && Math.abs(pt.lat - CITY.lat) < 0.01,
    `cityId=${pt.cityId} lat=${pt.lat} lon=${pt.lon}`)
  await main.locator('.prayer-settings').screenshot({ path: path.join(shots, 'prayer-settings.png') })

  // --- ADD_CREATES + GENTLE_FIELDS + DUE_TIMES ---
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(400)
  const addBtn = main.getByRole('button', { name: 'Add to my quests' })
  result('ADD_BUTTON_NOW_SHOWS', (await addBtn.count()) === 1)
  await addBtn.click()
  await main.waitForTimeout(900)
  const quests = readDb().quests
  const prayerQs = PRAYERS.map((t) => quests.find((q) => q.title === t))
  const quran = quests.find((q) => q.title === QURAN)
  result('ADD_CREATES', quests.length === 6 && prayerQs.every(Boolean) && !!quran,
    `total=${quests.length} prayers=${prayerQs.filter(Boolean).length} quran=${!!quran}`)

  const gentleOk = prayerQs.every(
    (q) =>
      q &&
      q.difficulty === 'Easy' &&
      q.importance === 'Medium' &&
      q.urgency === 'Low' &&
      q.timeEstimateMinutes === 10 && // 10 min → the gentle 2 XP locked in the spec
      (q.recurDays?.length ?? 0) === 7 &&
      q.subTasks.length === 0
  )
  result('GENTLE_FIELDS', gentleOk, `allGentle=${gentleOk}`)

  const day = expectedDay(new Date())
  const exp = day.due
  let maxDiff = 0
  let allOrdered = true
  let prev = 0
  for (const t of PRAYERS) {
    const q = quests.find((x) => x.title === t)
    const got = Date.parse(q.dueAt)
    const want = exp[DUE_KEY[t]].getTime()
    maxDiff = Math.max(maxDiff, Math.abs(got - want))
    if (got <= prev) allOrdered = false
    prev = got
  }
  result('DUE_TIMES', maxDiff < 60000 && allOrdered,
    `maxDiffSec=${Math.round(maxDiff / 1000)} chronological=${allOrdered}`)

  // FRAME_ASSIGNMENT: each prayer lands in the frame containing its actual time
  // (not all dumped into Morning), so it can surface in its own window.
  let framesOk = true
  const placed = {}
  for (const t of PRAYERS) {
    const q = quests.find((x) => x.title === t)
    const want = frameForTime(day[DUE_KEY[t]])
    placed[t] = q.timeFrameId
    if (q.timeFrameId !== want) framesOk = false
  }
  const spread = new Set(Object.values(placed)).size
  result('FRAME_ASSIGNMENT', framesOk && spread > 1,
    `correct=${framesOk} distinctFrames=${spread} (${PRAYERS.map((t) => `${t}:${placed[t]}`).join(' ')})`)

  // --- CARD_FLIPS ---
  await main.waitForTimeout(300)
  const cardText1 = (await main.locator('.faith-card').textContent()) ?? ''
  const addGone = await main.getByRole('button', { name: 'Add to my quests' }).count()
  result('CARD_FLIPS', cardText1.includes('Added') && addGone === 0,
    `added=${cardText1.includes('Added')} addBtnGone=${addGone === 0}`)

  // --- NO_DUP ---
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForTimeout(250)
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(400)
  result('NO_DUP', readDb().quests.length === 6, `quests=${readDb().quests.length}`)

  // --- DAILY_RECOMPUTE: relaunch on a new day with faked-old dueAt ---
  await app.close()
  app = null
  const db = readDb()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  db.lastSeenDate = ymd(yesterday)
  db.quests = db.quests.map((q) =>
    PRAYERS.includes(q.title) ? { ...q, dueAt: '2020-01-01T00:00:00.000Z' } : q
  )
  writeDb(db)

  app = await launch()
  main = app.windows().find((w) => w.url().includes('index.html'))
  await main.waitForTimeout(1800) // let the rollover restamp + persist
  const after = readDb().quests
  const exp2 = expectedDay(new Date()).due
  let recomputed = true
  let maxDiff2 = 0
  for (const t of PRAYERS) {
    const q = after.find((x) => x.title === t)
    if (!q || q.dueAt.startsWith('2020')) recomputed = false
    else maxDiff2 = Math.max(maxDiff2, Math.abs(Date.parse(q.dueAt) - exp2[DUE_KEY[t]].getTime()))
  }
  result('DAILY_RECOMPUTE', recomputed && maxDiff2 < 60000,
    `restamped=${recomputed} maxDiffSec=${Math.round(maxDiff2 / 1000)}`)

  // --- TOGGLE_OFF_KEEPS_DATA ---
  const before = readDb().quests.length
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForTimeout(400)
  await main
    .locator('.feature-toggle', { hasText: 'Salah' })
    .locator('input[type="checkbox"]')
    .click()
  await main.waitForTimeout(700)
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForTimeout(400)
  const cardHidden = await main.locator('.faith-card').count()
  const kept = readDb().quests.length
  const flagOff = readDb().settings.enabledFeatures.faithChecklist === false
  result('TOGGLE_OFF_KEEPS_DATA', cardHidden === 0 && kept === before && flagOff,
    `cardHidden=${cardHidden === 0} kept=${kept === before} flagOff=${flagOff}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
