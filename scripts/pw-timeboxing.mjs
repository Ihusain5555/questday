// Playwright driver — 📦 Timebox (time-blocking slice C). Verifies the current
// quest can be timeboxed via the Focus timer: the button is sized from the
// quest's estimate × the planning-fallacy buffer, and starting it runs a
// hard-stop countdown labelled "Timebox" that ticks down.
//
// ISOLATION: own --user-data-dir (temp) → never touches the real db.json, own
// single-instance lock. Safe to run alongside other terminals.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const isoDir = path.join(tmpdir(), 'questday-iso-timeboxing')
mkdirSync(isoDir, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
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

// Current quest with a 20-min estimate → timebox = max(5, round(20 × 1.5)) = 30m.
const seed = {
  version: 1,
  quests: [
    {
      id: 'q-tb', title: 'Draft the proposal', subTasks: [], difficulty: 'Medium',
      priority: 'High', skippability: 'Must do', timeEstimateMinutes: 20, dueAt: null,
      timeFrameId: activeFrame.id, status: 'active', createdAt: d.toISOString(),
      completedAt: null, sortOrder: 0
    }
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
    focusPreset: 'pomodoro', enabledFeatures: { focus: true }
  },
  lastSeenDate: ymd(d)
}
writeFileSync(path.join(isoDir, 'db.json'), JSON.stringify(seed, null, 2))

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

const app = await electron.launch({ args: [root, `--user-data-dir=${isoDir}`], cwd: root })
try {
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const dir = await app.evaluate(async ({ app }) => app.getPath('userData'))
  result('ISOLATION_TEST', dir.toLowerCase() === isoDir.toLowerCase(),
    `userData = ${dir} (want isolated temp dir)`)
  const main = app.windows().find((w) => w.url().includes('index.html'))

  // Focus now lives under the "Productivity" tab (restructure).
  await main.getByRole('button', { name: 'Productivity', exact: true }).click()
  await main.waitForTimeout(300)
  await main.getByRole('button', { name: 'Focus', exact: true }).click()
  await main.waitForTimeout(400)

  // --- Timebox button present, sized 20 × 1.5 = 30m ---
  const tb = main.locator('.focus-timebox')
  const tbText = (await tb.textContent())?.trim() ?? ''
  result('TIMEBOX_BTN_TEST', (await tb.count()) === 1 && tbText.includes('30m'),
    `button: "${tbText}" (want includes 30m)`)
  await main.screenshot({ path: path.join(shots, 'timebox-idle.png') })

  // --- Starting it runs a hard-stop countdown from 30:00, labelled Timebox ---
  await tb.click()
  await main.waitForTimeout(150)
  const t0 = (await main.locator('.focus-time').textContent())?.trim()
  result('TIMEBOX_START_TEST', t0 === '30:00' || t0 === '29:59',
    `time just after start: "${t0}" (want 30:00)`)
  result('TIMEBOX_LABEL_TEST',
    ((await main.locator('.focus-phase').textContent()) ?? '').toLowerCase().includes('timebox'),
    `phase label: "${((await main.locator('.focus-phase').textContent()) ?? '').trim()}"`)
  await main.waitForTimeout(1500)
  const t1 = (await main.locator('.focus-time').textContent())?.trim()
  result('TIMEBOX_COUNTDOWN_TEST', t1 !== '30:00' && /^29:5\d$/.test(t1 ?? ''),
    `time after ~1.5s: "${t1}" (want 29:5x — counted down)`)
  await main.screenshot({ path: path.join(shots, 'timebox-running.png') })

  // --- Reset returns to idle, timebox button available again ---
  await main.getByRole('button', { name: 'Reset' }).click()
  await main.waitForTimeout(300)
  result('TIMEBOX_RESET_TEST', (await main.locator('.focus-timebox').count()) === 1,
    'timebox button back after reset')

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  await app.close()
  process.exitCode = 1
}
console.log('closed (isolated dir:', isoDir + ')')
