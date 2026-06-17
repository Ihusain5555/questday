// Playwright driver — Quests scaling + icon action buttons. Drives the REAL app
// (built out/) in an isolated --user-data-dir and captures the Quests tab at the
// wide default (1040px, rail beside) and the window minimum (720px, rail stacked),
// and confirms the action buttons are now icon-only (looked up by aria-label).
//   ICON_BUTTONS — Edit/Duplicate/Drop/Delete/Save-as-template all present (by name).
//   WIDE / NARROW — screenshots to pw-shots/ for visual review.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const today = ymd(d)

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

const sub = (id, t, i) => ({ id, title: t, order: i, done: false })
const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  // questLibrary left ON (rail visible) to test the cramped two-column case.
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world: true }, realmChronicle: []
}

const seed = () => ({
  version: 1,
  quests: [
    {
      id: 'q1',
      title: 'Reply to all the client emails about the Q3 launch follow-ups and the vendor contracts',
      subTasks: [sub('q1s1', 'Draft the first reply', 0), sub('q1s2', 'Send the vendor note', 1)],
      difficulty: 'Hard', importance: 'High', urgency: 'High', timeEstimateMinutes: 45,
      dueAt: null, timeFrameId: 'tf-morning', status: 'active',
      createdAt: d.toISOString(), completedAt: null, sortOrder: 0
    },
    {
      id: 'q2', title: 'Gym — push day', subTasks: [],
      difficulty: 'Medium', importance: 'Medium', urgency: 'Low', timeEstimateMinutes: 60,
      dueAt: null, timeFrameId: 'tf-morning', status: 'active',
      createdAt: d.toISOString(), completedAt: null, sortOrder: 1
    },
    {
      id: 'q3', title: 'Morning pages', subTasks: [],
      difficulty: 'Easy', importance: 'Low', urgency: 'Low', timeEstimateMinutes: 10,
      dueAt: null, timeFrameId: 'tf-morning', status: 'completed',
      createdAt: d.toISOString(), completedAt: d.toISOString(), sortOrder: 2,
      recurDays: [0, 1, 2, 3, 4, 5, 6], completionDates: [today]
    }
  ],
  timeFrames: frames,
  player: { xp: 80, level: 2, currency: 0, streakCount: 3, lastCompletionDate: today, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 5 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [
    { id: 'tpl1', title: 'Work day — startup', subTasks: [sub('t1', 'Step 1', 0)],
      difficulty: 'Hard', importance: 'High', urgency: 'High', timeEstimateMinutes: 45, createdAt: d.toISOString() }
  ],
  lastSeenDate: today
})

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const dir = path.join(tmpdir(), 'questday-iso-scale')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed(), null, 2))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))

  await main.getByRole('button', { name: 'Quests', exact: true }).click()
  await main.waitForSelector('.quest-row', { timeout: 5000 })
  await main.waitForTimeout(400)

  // --- ICON_BUTTONS (looked up by the aria-labels that replace the old text) ---
  const names = ['Edit', 'Duplicate', 'Drop', 'Delete', 'Save as template']
  const counts = {}
  for (const n of names) counts[n] = await main.getByRole('button', { name: n }).count()
  const allPresent = names.every((n) => counts[n] >= 1)
  result('ICON_BUTTONS', allPresent, names.map((n) => `${n}=${counts[n]}`).join(' '))

  // --- WIDE (default 1040; rail beside) ---
  await main.screenshot({ path: path.join(shots, 'quests-wide.png') })

  // --- NARROW (720 = window min; rail should stack under the list) ---
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((x) => x.getURL().includes('index.html'))
    if (w) w.setSize(720, 740)
  })
  await main.waitForTimeout(600)
  const railW = await main.evaluate(() => {
    const rail = document.querySelector('.library-rail')
    return rail ? parseFloat(getComputedStyle(rail).width) : -1
  })
  // At 720px the rail must drop full-width (well over its 308px sidebar size).
  result('NARROW_RAIL_FULL_WIDTH', railW > 360, `railWidth=${railW}px (was 308 sidebar)`)
  await main.screenshot({ path: path.join(shots, 'quests-narrow.png') })
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
