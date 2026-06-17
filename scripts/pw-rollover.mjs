// Playwright driver — daily ROLLOVER + RECURRENCE (the time-dependent path that
// every other driver structurally skips by seeding today's date). Seeds
// lastSeenDate = yesterday with three quests and asserts the new-day routine:
//   (a) active non-overdue one-off  -> still active, rolledOverCount bumped to 1
//   (b) active OVERDUE one-off       -> still active, NOT bumped (surfaced for review)
//   (c) recurring completed yesterday-> reset to active, sub-tasks un-ticked,
//       completionDates history PRESERVED (tone rule: a win is never erased)
// Isolated --user-data-dir (own db.json + lock) — safe to run anytime.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const isoDir = path.join(tmpdir(), 'questday-iso-rollover')
mkdirSync(isoDir, { recursive: true })
const dbFile = path.join(isoDir, 'db.json')

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const today = ymd(now)
const yesterdayDate = new Date(now.getTime() - 24 * 3_600_000)
const yesterday = ymd(yesterdayDate)

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

const carryQuest = {
  id: 'roll-active', title: 'Carry me over', subTasks: [], difficulty: 'Easy',
  importance: 'Medium', urgency: 'Medium', timeEstimateMinutes: 15,
  dueAt: new Date(now.getTime() + 24 * 3_600_000).toISOString(), // tomorrow, not overdue
  timeFrameId: frames[0].id, status: 'active', createdAt: yesterdayDate.toISOString(),
  completedAt: null, sortOrder: 0
}
const overdueQuest = {
  id: 'roll-overdue', title: 'Past my due', subTasks: [], difficulty: 'Easy',
  importance: 'Medium', urgency: 'High', timeEstimateMinutes: 15,
  dueAt: new Date(now.getTime() - 6 * 3_600_000).toISOString(), // 6h ago, overdue
  timeFrameId: frames[0].id, status: 'active', createdAt: yesterdayDate.toISOString(),
  completedAt: null, sortOrder: 1
}
const recurQuest = {
  id: 'roll-recur', title: 'Daily habit', difficulty: 'Medium', importance: 'Medium',
  urgency: 'Medium', timeEstimateMinutes: 20, dueAt: null, timeFrameId: frames[0].id,
  status: 'completed', createdAt: yesterdayDate.toISOString(), completedAt: yesterdayDate.toISOString(),
  sortOrder: 2, recurDays: [0, 1, 2, 3, 4, 5, 6], completionDates: [yesterday],
  subTasks: [{ id: 'st1', title: 'step', order: 0, done: true }],
  completionAward: { xp: 10, currency: 0 }
}

const seed = {
  version: 1,
  quests: [carryQuest, overdueQuest, recurQuest],
  timeFrames: frames,
  player: { xp: 50, level: 2, currency: 0, streakCount: 1, lastCompletionDate: yesterday, arcadeTickets: 1 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 1 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  focus: { sessionsRewardedOn: null, sessionsRewardedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
    focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true }, realmChronicle: []
  },
  lastSeenDate: yesterday // <-- the whole point: a fresh day must be detected
}
writeFileSync(dbFile, JSON.stringify(seed, null, 2))

const readDb = () => JSON.parse(readFileSync(dbFile, 'utf8'))
let failed = 0
const result = (name, pass, extra = '') => {
  if (!pass) failed++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
try {
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  // Poll for the rollover to fire (App.tsx runs it once the day is detected as new).
  let db = readDb()
  for (let i = 0; i < 24 && db.lastSeenDate !== today; i++) {
    await sleep(300)
    db = readDb()
  }

  result('ROLLOVER_FIRED_TEST', db.lastSeenDate === today, `lastSeenDate=${db.lastSeenDate} (want ${today})`)

  const a = db.quests.find((q) => q.id === 'roll-active')
  const b = db.quests.find((q) => q.id === 'roll-overdue')
  const c = db.quests.find((q) => q.id === 'roll-recur')

  result('CARRY_TEST', a?.status === 'active' && a?.rolledOverCount === 1,
    `status=${a?.status} rolledOverCount=${a?.rolledOverCount} (want 1)`)
  result('REVIEW_TEST', b?.status === 'active' && !b?.rolledOverCount,
    `status=${b?.status} rolledOverCount=${b?.rolledOverCount} (want active, not bumped)`)
  result('RECUR_RENEW_TEST',
    c?.status === 'active' && c?.completedAt === null &&
      (c?.completionAward === undefined || c?.completionAward === null) &&
      Array.isArray(c?.subTasks) && c.subTasks.every((s) => s.done === false),
    `status=${c?.status} completedAt=${c?.completedAt} award=${JSON.stringify(c?.completionAward)}`)
  result('HISTORY_INTACT_TEST',
    Array.isArray(c?.completionDates) && c.completionDates.includes(yesterday),
    `completionDates=${JSON.stringify(c?.completionDates)} (must still include ${yesterday})`)

  const main = app.windows().find((w) => w.url().includes('index.html'))
  if (main) await main.screenshot({ path: path.join(shots, 'rollover-after.png') })

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  failed++
  await app.close()
}
console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILURE(S)'} (isolated dir: ${isoDir})`)
process.exitCode = failed === 0 ? 0 : 1
