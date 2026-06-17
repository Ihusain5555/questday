// Playwright driver — segmented capacity bar (Request B, v1.12). Drives the REAL
// app (built out/) in an isolated --user-data-dir and verifies the per-quest
// time-segments + the over-capacity hatch.
//   ISOLATION    — userData IS the temp dir.
//   SEG_COUNT    — Morning frame (under capacity) renders one .capacity-seg per quest (4).
//   NO_OVER_UNDER— the under-capacity frame shows NO .capacity-over hatch.
//   OVER_HATCH   — the over-capacity (Night) frame shows exactly one .capacity-over hatch.
//   SCREENSHOT   — pw-shots/capacity-bar.png for visual review.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

let qn = 0
const q = (title, min, frame) => ({
  id: `q${++qn}`,
  title,
  subTasks: [],
  difficulty: 'Medium',
  importance: 'Medium',
  urgency: 'Medium',
  timeEstimateMinutes: min,
  dueAt: null,
  timeFrameId: frame,
  status: 'active',
  createdAt: new Date().toISOString(),
  completedAt: null,
  sortOrder: qn,
  recurDays: []
})

const quests = [
  // Morning 420 min → 195 planned (under capacity): 4 segments, no hatch.
  q('Write report', 90, 'tf-morning'),
  q('Gym', 60, 'tf-morning'),
  q('Emails', 30, 'tf-morning'),
  q('Tidy desk', 15, 'tf-morning'),
  // Night 480 min → 540 planned (over capacity): 2 segments + over hatch.
  q('Deep work', 300, 'tf-night'),
  q('Long study', 240, 'tf-night')
]

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro',
  enabledFeatures: { focus: true, matrix: true, world: true, questLibrary: false, faithChecklist: false },
  realmChronicle: []
}

const seed = {
  version: 1,
  quests,
  timeFrames: frames,
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: ymd(d)
}

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}

const dir = path.join(tmpdir(), 'questday-iso-capacity')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed, null, 2))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.capacity-track', { timeout: 5000 })
  await main.waitForTimeout(400)

  // Each frame section has its own capacity bar. Find the Morning bar (4 segs, no over)
  // and the Night bar (2 segs + over hatch) by segment count.
  const tracks = await main.locator('.capacity-track').count()
  const segCounts = await main.locator('.capacity-track').evaluateAll((els) =>
    els.map((el) => ({
      segs: el.querySelectorAll('.capacity-seg').length,
      over: el.querySelectorAll('.capacity-over').length
    }))
  )
  const under = segCounts.find((s) => s.segs === 4)
  const over = segCounts.find((s) => s.segs === 2)
  result('SEG_COUNT', !!under && under.segs === 4, `tracks=${tracks} counts=${JSON.stringify(segCounts)}`)
  result('NO_OVER_UNDER', !!under && under.over === 0, `underOver=${under?.over}`)
  result('OVER_HATCH', !!over && over.over === 1, `overSegs=${over?.segs} overHatch=${over?.over}`)

  await main.screenshot({ path: path.join(shots, 'capacity-bar.png') })
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
