// Playwright driver — Weekly Review card (Dashboard). Drives the REAL app (built
// out/) in an isolated --user-data-dir (the real db.json is NEVER touched) and
// verifies the recap reads existing completion data correctly + the toggle.
//   ISOLATION     — userData IS the temp dir.
//   CARD_SHOWN    — default ON (key omitted) → the .weekly-review card renders.
//   RECAP_VALUES  — total=6, days=3, best day = yesterday (3), power hour = Morning,
//                   streak=4 — all derived purely from the seeded completion history.
//   TOGGLE_OFF    — Data-tab toggle OFF hides the card; the flag persists false.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const dayKey = (offset) => {
  const x = new Date()
  x.setDate(x.getDate() - offset)
  return ymd(x)
}
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const fullDayName = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return FULL_DAYS[new Date(y, m - 1, d).getDay()]
}

const today = dayKey(0)
const yest = dayKey(1)
const two = dayKey(2)

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

// Recurring quests carry their wins in completionDates (the daily reset never
// erases a win). Crafted so: per-day today=2, yesterday=3, two-ago=1 → total 6,
// 3 active days, best day = yesterday (3); Morning frame = 5 vs Evening = 1.
const recur = (id, frameId, dates) => ({
  id,
  title: `Daily ${id}`,
  subTasks: [],
  difficulty: 'Easy',
  importance: 'Medium',
  urgency: 'Low',
  timeEstimateMinutes: 10,
  dueAt: null,
  timeFrameId: frameId,
  status: 'active',
  createdAt: new Date().toISOString(),
  completedAt: null,
  sortOrder: 0,
  recurDays: [0, 1, 2, 3, 4, 5, 6],
  completionDates: dates
})

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro',
  // weeklyReview intentionally OMITTED — missing key = ON (tests the default-on convention).
  enabledFeatures: { focus: true, matrix: true, world: true },
  realmChronicle: []
}

const seed = () => ({
  version: 1,
  quests: [
    recur('a', 'tf-morning', [two, yest, today]),
    recur('b', 'tf-morning', [yest, today]),
    recur('c', 'tf-evening', [yest])
  ],
  timeFrames: frames,
  player: { xp: 120, level: 2, currency: 0, streakCount: 4, lastCompletionDate: today, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 6 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: today
})

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const dir = path.join(tmpdir(), 'questday-iso-weekly')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed(), null, 2))
const readDb = () => JSON.parse(readFileSync(path.join(dir, 'db.json'), 'utf-8'))

const txt = async (main, sel) => ((await main.locator(sel).textContent()) ?? '').trim()

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForSelector('.weekly-review', { timeout: 5000 })
  await main.waitForTimeout(400)

  // --- CARD_SHOWN ---
  const cards = await main.locator('.weekly-review').count()
  result('CARD_SHOWN', cards === 1, `count=${cards}`)
  await main.locator('.weekly-review').screenshot({ path: path.join(shots, 'weekly-review.png') })

  // --- RECAP_VALUES ---
  const total = await txt(main, '[data-wr="total"]')
  const days = await txt(main, '[data-wr="days"]')
  const bestday = await txt(main, '[data-wr="bestday"]')
  const frame = await txt(main, '[data-wr="frame"]')
  const streak = await txt(main, '[data-wr="streak"]')
  const wantBest = `${fullDayName(yest)} · 3`
  const ok =
    total === '6' && days === '3' && bestday === wantBest && frame === 'Morning' && streak === '4 days'
  result('RECAP_VALUES', ok,
    `total=${total} days=${days} best="${bestday}"(want "${wantBest}") frame=${frame} streak=${streak}`)

  // --- TOGGLE_OFF ---
  await main.getByRole('button', { name: 'Data', exact: true }).click()
  await main.waitForTimeout(400)
  await main
    .locator('.feature-toggle', { hasText: 'Weekly review' })
    .locator('input[type="checkbox"]')
    .click()
  await main.waitForTimeout(700)
  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForTimeout(400)
  const hidden = await main.locator('.weekly-review').count()
  const flagOff = readDb().settings.enabledFeatures.weeklyReview === false
  result('TOGGLE_OFF', hidden === 0 && flagOff, `hidden=${hidden === 0} flagOff=${flagOff}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
