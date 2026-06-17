// Playwright driver — "resting / welcome back" widget state. Drives the REAL app
// (built out/) in isolated --user-data-dirs (the real db.json is NEVER touched)
// and verifies the line appears ONLY on a genuine return, derived purely from
// player.lastCompletionDate. The line is ADDITIVE — the inviting next quest still
// shows below it.
//   GAP_3_SHOWS        — last win 3 days ago → line shows (+ the quest still shows).
//   BRAND_NEW_SHOWS    — never completed (null) → line shows.
//   WIN_TODAY_HIDDEN   — a win today → line hidden.
//   GAP_1_HIDDEN       — last win yesterday (gap 1) → line hidden.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
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

const now = new Date()
const m = now.getHours() * 60 + now.getMinutes()
const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]
const inFrame = (f) =>
  f.startMinute <= f.endMinute ? m >= f.startMinute && m < f.endMinute : m >= f.startMinute || m < f.endMinute
const af = frames.find(inFrame) ?? frames[0]

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world: true }, realmChronicle: []
}

const seed = (lastCompletionDate) => ({
  version: 1,
  quests: [
    {
      id: 'q1',
      title: 'Reply to client emails',
      subTasks: [{ id: 's1', title: 'Draft the first one', order: 0, done: false }],
      difficulty: 'Medium', importance: 'High', urgency: 'High', timeEstimateMinutes: 30,
      dueAt: null, timeFrameId: af.id, status: 'active',
      createdAt: now.toISOString(), completedAt: null, sortOrder: 0
    }
  ],
  timeFrames: frames,
  player: { xp: 40, level: 1, currency: 0, streakCount: 0, lastCompletionDate, arcadeTickets: 0 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings,
  townLayouts: {},
  questTemplates: [],
  lastSeenDate: ymd(now)
})

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

async function probe(name, lastCompletionDate, expectResting) {
  const dir = path.join(tmpdir(), `questday-iso-resting-${name}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed(lastCompletionDate), null, 2))
  let app
  try {
    app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
    await (await app.firstWindow()).waitForLoadState('domcontentloaded')
    await new Promise((r) => setTimeout(r, 1800))
    let widget = app.windows().find((w) => w.url().includes('widget.html'))
    if (!widget) {
      await new Promise((r) => setTimeout(r, 800))
      widget = app.windows().find((w) => w.url().includes('widget.html'))
    }
    if (!widget) {
      result(name, false, 'widget window not found')
      return
    }
    await widget.waitForSelector('.widget', { timeout: 5000 })
    await widget.waitForTimeout(300)
    const restingCount = await widget.locator('.widget-resting').count()
    const text = restingCount ? ((await widget.locator('.widget-resting').textContent()) ?? '').trim() : ''
    const questShows = (await widget.locator('.quest-title').count()) === 1
    if (expectResting && restingCount === 1) {
      await widget.locator('.widget').screenshot({ path: path.join(shots, `resting-${name}.png`) })
    }
    const ok = expectResting
      ? restingCount === 1 && text.includes('Welcome back') && questShows
      : restingCount === 0 && questShows
    result(name, ok, `resting=${restingCount} questShows=${questShows}${text ? ` text="${text}"` : ''}`)
  } catch (err) {
    result(name, false, err?.message ?? String(err))
  } finally {
    if (app) await app.close()
    await new Promise((r) => setTimeout(r, 400))
  }
}

await probe('GAP_3_SHOWS', dayKey(3), true)
await probe('BRAND_NEW_SHOWS', null, true)
await probe('WIN_TODAY_HIDDEN', ymd(now), false)
await probe('GAP_1_HIDDEN', dayKey(1), false)
console.log('closed')
