// Playwright driver — End-of-day Wind-Down (v2). Drives the REAL app (built out/) in an
// isolated --user-data-dir and verifies the Dashboard card end-to-end:
//   ISOLATION    — userData IS the temp dir (real db.json untouched).
//   WINS_RECAP   — today's completed quest shows in the wins list with its XP.
//   PUSH_BUTTON  — the wrap-up button appears and counts the open quest.
//   PUSH_ACTION  — clicking it snoozes the active quest to ~next local midnight.
//   REWARDS_EXACT— pushing changes NO reward state (player.xp + completionAward intact).
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const now = new Date()
const todayIso = now.toISOString()
const tomorrowMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime()

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]
const baseQ = {
  subTasks: [],
  difficulty: 'Easy',
  importance: 'Medium',
  urgency: 'Medium',
  timeEstimateMinutes: 10,
  dueAt: null,
  timeFrameId: 'tf-morning',
  createdAt: todayIso
}
const seed = {
  version: 1,
  quests: [
    { ...baseQ, id: 'done1', title: 'Did this today', status: 'completed', completedAt: todayIso, completionAward: { xp: 5, currency: 0 }, sortOrder: 0 },
    { ...baseQ, id: 'open1', title: 'Still open', status: 'active', completedAt: null, sortOrder: 1 }
  ],
  timeFrames: frames,
  player: { xp: 5, level: 1, currency: 0, streakCount: 1, lastCompletionDate: ymd(now), arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings: { enabledFeatures: { focus: true, matrix: true, endOfDayNote: true } },
  townLayouts: {},
  questTemplates: [],
  dailyNotes: {},
  lastSeenDate: ymd(now)
}

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}

const dir = path.join(tmpdir(), 'questday-iso-winddown')
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

  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForSelector('.eod-card', { timeout: 5000 })
  await main.waitForTimeout(300)

  // WINS_RECAP — the completed quest appears with the XP total.
  const winsHead = (await main.locator('.eod-wins-head').textContent()) ?? ''
  const winsList = (await main.locator('.eod-wins-list').textContent()) ?? ''
  result('WINS_RECAP', /1 win/.test(winsHead) && /\+5 XP/.test(winsHead) && /Did this today/.test(winsList),
    `head="${winsHead.trim()}" list="${winsList.trim()}"`)
  await main.locator('.eod-card').screenshot({ path: path.join(shots, 'winddown.png') })

  // PUSH_BUTTON — appears and counts the one open quest.
  const pushBtn = main.locator('.eod-push')
  const pushText = (await pushBtn.textContent()) ?? ''
  result('PUSH_BUTTON', (await pushBtn.count()) === 1 && /1 open quest/.test(pushText), `text="${pushText.trim()}"`)

  // PUSH_ACTION — clicking snoozes the active quest to ~next local midnight.
  await pushBtn.click()
  await main.waitForTimeout(700)
  const db2 = readDb()
  const open = db2.quests.find((q) => q.id === 'open1')
  const snoozeOk = open.snoozedUntil != null && Date.parse(open.snoozedUntil) >= tomorrowMs
  const confirmShown = (await main.locator('.eod-pushed').count()) === 1
  result('PUSH_ACTION', snoozeOk && confirmShown, `snoozedUntil=${open.snoozedUntil} confirm=${confirmShown}`)

  // REWARDS_EXACT — pushing touched no reward state.
  const done = db2.quests.find((q) => q.id === 'done1')
  result('REWARDS_EXACT', db2.player.xp === 5 && done.completionAward?.xp === 5 && open.status === 'active',
    `xp=${db2.player.xp} award=${done.completionAward?.xp} openStatus=${open.status}`)
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
