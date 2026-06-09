// Playwright driver — 🧭 Eisenhower matrix. Verifies the urgent×important 2×2
// classifies active quests correctly (one seeded into each quadrant), the
// current quest is starred in its quadrant, and the tab/header read right.
//
// ISOLATION: launches Electron with its OWN --user-data-dir (a temp folder), so
// it NEVER touches the real %APPDATA%\questday\db.json and gets its OWN
// single-instance lock — safe to run while other terminals/agents work. No
// stash/restore needed because we never open the real data dir.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

// Dedicated, isolated user-data dir (own db.json + own instance lock).
const isoDir = path.join(tmpdir(), 'questday-iso-eisenhower')
mkdirSync(isoDir, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
const iso = (msFromNow) => new Date(d.getTime() + msFromNow).toISOString()
const H = 3_600_000

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]
const nowMin = d.getHours() * 60 + d.getMinutes()
const covers = (f) =>
  f.startMinute <= f.endMinute
    ? nowMin >= f.startMinute && nowMin < f.endMinute
    : nowMin >= f.startMinute || nowMin < f.endMinute
const activeFrame = frames.find(covers) ?? frames[0]

// One quest engineered for each quadrant (urgentWithinHours=24; important =
// Must do/Should do OR High/Critical priority):
const q = (id, title, extra) => ({
  id, title, subTasks: [], difficulty: 'Medium', priority: 'Medium', skippability: 'Should do',
  timeEstimateMinutes: 20, dueAt: null, timeFrameId: activeFrame.id, status: 'active',
  createdAt: d.toISOString(), completedAt: null, sortOrder: 0, ...extra
})
const seed = {
  version: 1,
  quests: [
    // DO: urgent (due +3h) + important (Must do)
    q('q-do', 'Ship the release', { dueAt: iso(3 * H), skippability: 'Must do', priority: 'Critical', sortOrder: 0 }),
    // SCHEDULE: not urgent (due +72h) + important (Must do)
    q('q-sched', 'Plan next quarter', { dueAt: iso(72 * H), skippability: 'Must do', priority: 'High', sortOrder: 1 }),
    // MINIMIZE: urgent (due +3h) + NOT important (Nice to have, Low)
    q('q-min', 'Reply to newsletter', { dueAt: iso(3 * H), skippability: 'Nice to have', priority: 'Low', sortOrder: 2 }),
    // LATER: not urgent (undated) + NOT important (Nice to have, Low)
    q('q-later', 'Reorganize bookmarks', { dueAt: null, skippability: 'Nice to have', priority: 'Low', sortOrder: 3 })
  ],
  timeFrames: frames,
  player: { xp: 0, level: 3, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
  focus: { sessionsRewardedOn: null, sessionsRewardedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
    focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true }
  },
  lastSeenDate: ymd(d)
}
writeFileSync(path.join(isoDir, 'db.json'), JSON.stringify(seed, null, 2))

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
const quadCount = (main, key) =>
  main.locator(`.eh-quad[data-quad="${key}"] .eh-chip`).count()

const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
try {
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const dir = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION_TEST', dir.toLowerCase() === isoDir.toLowerCase(),
    `userData = ${dir} (want isolated temp dir, NOT real APPDATA)`)
  const main = app.windows().find((w) => w.url().includes('index.html'))

  // --- Open the Matrix tab ---
  await main.getByRole('button', { name: 'Matrix' }).click()
  await main.waitForTimeout(400)
  result('EH_GRID_TEST', (await main.locator('.eh-quad').count()) === 4,
    `${await main.locator('.eh-quad').count()} quadrants (want 4)`)
  result('EH_HEADER_TEST',
    ((await main.locator('.eh-hint').textContent()) ?? '').includes('4 active quests'),
    `header: "${((await main.locator('.eh-hint').textContent()) ?? '').trim()}"`)
  await main.screenshot({ path: path.join(shots, 'eisenhower.png') })

  // --- Each quest lands in the right quadrant ---
  result('EH_DO_TEST',
    (await quadCount(main, 'do')) === 1 &&
      ((await main.locator('.eh-quad[data-quad="do"]').textContent()) ?? '').includes('Ship the release'),
    `do=${await quadCount(main, 'do')} (want 1: Ship the release)`)
  result('EH_SCHEDULE_TEST',
    (await quadCount(main, 'schedule')) === 1 &&
      ((await main.locator('.eh-quad[data-quad="schedule"]').textContent()) ?? '').includes('Plan next quarter'),
    `schedule=${await quadCount(main, 'schedule')} (want 1: Plan next quarter)`)
  result('EH_MINIMIZE_TEST',
    (await quadCount(main, 'minimize')) === 1 &&
      ((await main.locator('.eh-quad[data-quad="minimize"]').textContent()) ?? '').includes('Reply to newsletter'),
    `minimize=${await quadCount(main, 'minimize')} (want 1: Reply to newsletter)`)
  result('EH_LATER_TEST',
    (await quadCount(main, 'later')) === 1 &&
      ((await main.locator('.eh-quad[data-quad="later"]').textContent()) ?? '').includes('Reorganize bookmarks'),
    `later=${await quadCount(main, 'later')} (want 1: Reorganize bookmarks)`)

  // --- The current quest is starred, and sits in the Do-now quadrant ---
  result('EH_CURRENT_STAR_TEST',
    (await main.locator('.eh-chip.current').count()) === 1 &&
      (await main.locator('.eh-quad[data-quad="do"] .eh-chip.current').count()) === 1,
    `${await main.locator('.eh-chip.current').count()} starred (want 1, in Do-now)`)

  // --- Toggle (Data → Productivity features) hides/shows the Matrix tab ---
  await main.getByRole('button', { name: 'Data' }).click()
  await main.waitForTimeout(400)
  const sw = main.locator('.feature-toggle', { hasText: 'Eisenhower matrix' }).locator('input')
  result('EH_TOGGLE_PRESENT_TEST', (await sw.count()) === 1, 'Matrix toggle present in settings')
  await sw.uncheck()
  await main.waitForTimeout(400)
  result('EH_TAB_HIDDEN_TEST',
    (await main.getByRole('button', { name: 'Matrix', exact: true }).count()) === 0,
    'Matrix tab hidden after toggle off')
  await sw.check()
  await main.waitForTimeout(400)
  result('EH_TAB_RESTORED_TEST',
    (await main.getByRole('button', { name: 'Matrix', exact: true }).count()) === 1,
    'Matrix tab returns after toggle on')

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  await app.close()
  process.exitCode = 1
}
console.log('closed (isolated dir:', isoDir + ')')
