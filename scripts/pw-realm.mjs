// Playwright driver — 🗺️ The Realm map (reward artifact). Verifies regions
// reveal from all-time completions, the Dashboard peek reads right, completing
// a quest charts the NEXT region with a celebration line, and the count moves.
// Also bundles a visual check of the recent emoji→Phosphor conversions (Focus,
// Time frames, Arcade, Data).
//
// ISOLATION: launches Electron with its OWN --user-data-dir (a temp folder), so
// it NEVER touches the real %APPDATA%\questday\db.json and gets its OWN
// single-instance lock — safe to run anytime. No stash/restore needed.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const isoDir = path.join(tmpdir(), 'questday-iso-realm')
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

// 8 already-completed quests => totalCompletions starts at 8 (reveals the 7
// regions with at<=8). Plus ONE active current quest; completing it makes 9,
// which charts "Pale Vale" (at:9) — the celebration should announce it.
const done = Array.from({ length: 8 }, (_, i) => ({
  id: `done-${i}`, title: `Past quest ${i + 1}`, subTasks: [], difficulty: 'Easy',
  priority: 'Medium', skippability: 'Should do', timeEstimateMinutes: 10, dueAt: null,
  timeFrameId: frames[0].id, status: 'completed', createdAt: d.toISOString(),
  completedAt: d.toISOString(), sortOrder: i, completionAward: { xp: 10, currency: 5 }
}))
const current = {
  id: 'q-current', title: 'Chart the next region', subTasks: [], difficulty: 'Medium',
  priority: 'Critical', skippability: 'Must do', timeEstimateMinutes: 20, dueAt: iso(2 * H),
  timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
  completedAt: null, sortOrder: 0
}

const seed = {
  version: 1,
  quests: [current, ...done],
  timeFrames: frames,
  player: { xp: 120, level: 5, currency: 60, streakCount: 3, lastCompletionDate: ymd(d), arcadeTickets: 2 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 3 },
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
const text = async (loc) => ((await loc.textContent()) ?? '').replace(/\s+/g, ' ').trim()

const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
try {
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const dir = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION_TEST', dir.toLowerCase() === isoDir.toLowerCase(), `userData = ${dir}`)
  const main = app.windows().find((w) => w.url().includes('index.html'))

  // --- Dashboard peek reads the realm progress (8 completions => 7/15) ---
  result('PEEK_PRESENT_TEST', (await main.locator('.realm-peek').count()) === 1, 'Dashboard realm peek present')
  const peekCount = await text(main.locator('.realm-peek-count'))
  result('PEEK_COUNT_TEST', peekCount.includes('7 / 15'), `peek: "${peekCount}" (want 7 / 15)`)
  await main.screenshot({ path: path.join(shots, 'realm-dashboard-peek.png') })

  // --- Complete the current quest => charts Pale Vale, celebration announces it ---
  await main.locator('.cq-complete').first().click()
  await main.waitForSelector('.celebrate-region', { timeout: 6000 })
  const region = await text(main.locator('.celebrate-region'))
  result('CELEBRATION_REGION_TEST', region.includes('Pale Vale'), `celebration: "${region}"`)
  await main.screenshot({ path: path.join(shots, 'realm-celebration.png') })
  // let the celebration auto-dismiss
  await main.waitForSelector('.celebrate-region', { state: 'detached', timeout: 8000 }).catch(() => {})
  await main.waitForTimeout(400)

  // --- Realm tab now shows 8/15 discovered (Pale Vale charted) ---
  await main.getByRole('button', { name: 'Realm', exact: true }).click()
  await main.waitForTimeout(500)
  const hint = await text(main.locator('.realm-hint'))
  result('REALM_COUNT_TEST', hint.includes('8 / 15'), `realm hint: "${hint}" (want 8 / 15)`)
  result('REALM_SVG_TEST', (await main.locator('.realm-svg').count()) === 1, 'realm SVG rendered')
  result('REALM_NEXT_TEST', (await text(main.locator('.realm-next'))).toLowerCase().includes('next'),
    `next: "${await text(main.locator('.realm-next'))}"`)
  await main.screenshot({ path: path.join(shots, 'realm-tab.png') })

  // --- Bundled emoji→Phosphor visual check (screenshots only) ---
  for (const [tab, file] of [
    ['Focus', 'emoji-focus.png'],
    ['Time frames', 'emoji-timeframes.png'],
    ['Arcade', 'emoji-arcade.png'],
    ['Data', 'emoji-data.png']
  ]) {
    await main.getByRole('button', { name: tab, exact: true }).click()
    await main.waitForTimeout(450)
    await main.screenshot({ path: path.join(shots, file) })
  }
  result('EMOJI_SHOTS_TEST', true, 'captured Focus/Time frames/Arcade/Data for visual review')

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  await app.close()
  process.exitCode = 1
}
console.log('closed (isolated dir:', isoDir + ')')
