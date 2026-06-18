// Playwright driver — v1.13 quick-adds: Snooze, Quest notes, End-of-day reflection.
// Drives the REAL app (built out/) in an isolated --user-data-dir and verifies each
// feature end-to-end, plus that ↩ Restore stays EXACT with the new fields present.
//   ISOLATION     — userData IS the temp dir (never the real db.json).
//   NOTES_DISPLAY — a seeded quest's notes render in .quest-notes.
//   NOTES_FORM    — the New-quest form exposes the notes textarea (.quest-notes-input).
//   CURRENT_BASE  — Dashboard current quest is the highest-priority quest (Top priority).
//   SNOOZE_HIDE   — snoozing it removes it from the spotlight (current becomes Backup task).
//   SNOOZE_PERSIST— the snooze writes snoozedUntil (future ISO) to db.json.
//   SNOOZE_WAKE   — Wake restores it as the current quest.
//   EOD_SAVE      — an end-of-day reflection persists into db.json dailyNotes[today].
//   RESTORE_EXACT — complete then ↩ Restore returns player.xp to its prior value.
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

// One all-day frame so the seeded quests are always candidates regardless of run time.
const frames = [{ id: 'tf-all', name: 'All day', startMinute: 0, endMinute: 1439, order: 0 }]

let qn = 0
const q = (title, importance, urgency, extra = {}) => ({
  id: `q${++qn}`,
  title,
  subTasks: [],
  difficulty: 'Medium',
  importance,
  urgency,
  timeEstimateMinutes: 30,
  dueAt: null,
  timeFrameId: 'tf-all',
  status: 'active',
  createdAt: new Date().toISOString(),
  completedAt: null,
  sortOrder: qn,
  recurDays: [],
  ...extra
})

const quests = [
  q('Top priority', 'High', 'High'),
  q('Backup task', 'Medium', 'Medium'),
  q('Call the bank', 'Low', 'Low', { notes: 'Ask about the late fee.' })
]

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro',
  enabledFeatures: {
    focus: true, matrix: true, world: true, questLibrary: false,
    faithChecklist: false, weeklyReview: true, endOfDayNote: true
  },
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
  questTemplates: {},
  dailyNotes: {},
  lastSeenDate: ymd(d)
}
// questTemplates must be an array (validate rejects a non-array); fix the typo above safely.
seed.questTemplates = []

let failures = 0
const result = (name, pass, extra = '') => {
  if (!pass) failures++
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
}

const dir = path.join(tmpdir(), 'questday-iso-quickadds')
mkdirSync(dir, { recursive: true })
const dbFile = path.join(dir, 'db.json')
writeFileSync(dbFile, JSON.stringify(seed, null, 2))
const readDb = () => JSON.parse(readFileSync(dbFile, 'utf-8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await sleep(1800)
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION', userData.toLowerCase() === dir.toLowerCase(), `dir=${dir}`)

  // ---- Quests tab: notes display + form ----
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.quest-row', { timeout: 5000 })
  await sleep(300)

  const notesText = await main.locator('.quest-notes').first().textContent()
  result('NOTES_DISPLAY', (notesText ?? '').includes('late fee'), `notes="${notesText}"`)

  await main.getByRole('button', { name: '+ New quest' }).click()
  await main.waitForSelector('.quest-notes-input', { timeout: 4000 })
  result('NOTES_FORM', (await main.locator('.quest-notes-input').count()) === 1)
  // Close the form (Cancel) without creating.
  await main.getByRole('button', { name: 'Cancel' }).click()
  await sleep(200)

  // ---- Dashboard baseline current quest ----
  const currentTitle = async () => (await main.locator('.cq-title').first().textContent())?.trim() ?? ''
  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForSelector('.cq-title', { timeout: 5000 })
  await sleep(300)
  result('CURRENT_BASE', (await currentTitle()) === 'Top priority', `current="${await currentTitle()}"`)

  // ---- Snooze the top quest from the Quests tab ----
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.quest-row', { timeout: 5000 })
  const topRow = main.locator('.quest-row', { hasText: 'Top priority' })
  await topRow.getByRole('button', { name: 'Snooze' }).click()
  await main.waitForSelector('.snooze-menu', { timeout: 3000 })
  await main.getByRole('button', { name: 'In 1 hour' }).click()
  await sleep(500)

  const dbAfterSnooze = readDb()
  const snoozed = dbAfterSnooze.quests.find((x) => x.title === 'Top priority')
  const snoozeFuture =
    !!snoozed?.snoozedUntil && Date.parse(snoozed.snoozedUntil) > Date.now()
  result('SNOOZE_PERSIST', snoozeFuture, `snoozedUntil=${snoozed?.snoozedUntil}`)

  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await sleep(400)
  result('SNOOZE_HIDE', (await currentTitle()) === 'Backup task', `current="${await currentTitle()}"`)

  // ---- Wake it back up ----
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.quest-row.snoozed', { timeout: 4000 })
  await main.locator('.quest-row', { hasText: 'Top priority' }).getByRole('button', { name: 'Wake' }).click()
  await sleep(500)
  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await sleep(400)
  result('SNOOZE_WAKE', (await currentTitle()) === 'Top priority', `current="${await currentTitle()}"`)

  // ---- End-of-day reflection ----
  const reflection = 'Alhamdulillah — shipped the quick-adds today.'
  await main.waitForSelector('.eod-input', { timeout: 4000 })
  await main.locator('.eod-input').fill(reflection)
  await main.getByRole('button', { name: /reflection/i }).click()
  await sleep(500)
  const dbAfterEod = readDb()
  result(
    'EOD_SAVE',
    dbAfterEod.dailyNotes?.[ymd(new Date())] === reflection,
    `saved="${dbAfterEod.dailyNotes?.[ymd(new Date())]}"`
  )

  // ---- ↩ Restore exactness with the new fields present ----
  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.quest-row', { timeout: 5000 })
  const xpBefore = readDb().player.xp
  const backupRow = main.locator('.quest-row', { hasText: 'Backup task' })
  await backupRow.getByRole('button', { name: 'Complete' }).click()
  // The completion celebration modal auto-dismisses after ~2400-3600ms.
  // Wait a safe margin and re-query the row (it may have re-rendered).
  await sleep(4000)
  const xpAfter = readDb().player.xp
  // Show completed quests so the 'Backup task' row is visible with its Restore button.
  // The checkbox is inside a label with that text.
  const showCompletedLabel = main.locator('label:has-text("Show completed quests") input[type=checkbox]')
  await showCompletedLabel.check()
  await sleep(300)
  // Restore button appears on the completed row.
  const backupRowAfter = main.locator('.quest-row').filter({ hasText: 'Backup task' })
  await backupRowAfter.getByRole('button', { name: 'Restore' }).click()
  await sleep(700)
  const dbRestored = readDb()
  const xpRestored = dbRestored.player.xp
  const backupActive = dbRestored.quests.find((x) => x.title === 'Backup task')?.status === 'active'
  result(
    'RESTORE_EXACT',
    xpAfter > xpBefore && xpRestored === xpBefore && backupActive,
    `before=${xpBefore} after=${xpAfter} restored=${xpRestored} active=${backupActive}`
  )

  await main.screenshot({ path: path.join(shots, 'quickadds.png') })
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`)
if (failures > 0) process.exitCode = 1
console.log('closed')
