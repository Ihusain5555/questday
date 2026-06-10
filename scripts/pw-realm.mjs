// Playwright driver — 🗺️ The Realm map + Expedition Chronicle. Verifies you earn
// an expedition per completed quest, tapping an unexplored region opens the
// "pick what to learn" modal (tease -> reveal), adding to the Chronicle charts
// the region, charted regions re-read, and completing a quest prompts another.
// Isolated --user-data-dir (own db.json + lock) — safe to run anytime.
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

// 10 completed quests => 10 expeditions; 4 regions already charted (with their
// Chronicle discoveries) => 6 spendable now. Plus one active quest to complete.
const done = Array.from({ length: 10 }, (_, i) => ({
  id: `done-${i}`, title: `Past quest ${i + 1}`, subTasks: [], difficulty: 'Easy',
  priority: 'Medium', skippability: 'Should do', timeEstimateMinutes: 10, dueAt: null,
  timeFrameId: frames[0].id, status: 'completed', createdAt: d.toISOString(),
  completedAt: d.toISOString(), sortOrder: i, completionAward: { xp: 10, currency: 5 }
}))
const current = {
  id: 'q-current', title: 'Chart your realm', subTasks: [], difficulty: 'Medium',
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
    focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true },
    realmChronicle: [
      { region: 'embergreen', topic: 'cosmos', entry: 'venus-day-longer-than-year' },
      { region: 'goldfield', topic: 'nature', entry: 'tardigrade-vacuum' },
      { region: 'sunmeadow', topic: 'history', entry: 'cleopatra-moon-landing' },
      { region: 'crownspire', topic: 'wisdom', entry: 'aurelius-obstacle-is-the-way' }
    ]
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

  // --- Realm tab: 4/15 charted, expeditions banner, claimable fog ---
  await main.getByRole('button', { name: 'Realm', exact: true }).click()
  await main.waitForTimeout(500)
  result('REALM_COUNT_TEST', (await text(main.locator('.realm-hint'))).includes('4 / 15'),
    `realm hint: "${await text(main.locator('.realm-hint'))}"`)
  result('CHRONICLE_CODEX_TEST', (await main.locator('.rc-item').count()) === 4,
    `${await main.locator('.rc-item').count()} chronicle entries (want 4)`)
  await main.screenshot({ path: path.join(shots, 'realm-tab.png') })

  // --- Tap a fog region => the "what to learn" modal opens ---
  await main.locator('.realm-claimable').first().click()
  await main.waitForSelector('.rm-topics', { timeout: 4000 })
  result('MODAL_TOPICS_TEST', (await main.locator('.rm-topic').count()) === 5,
    `${await main.locator('.rm-topic').count()} topic choices (want 5 incl. Surprise)`)
  await main.screenshot({ path: path.join(shots, 'realm-modal-pick.png') })

  // --- Pick a topic => tease then reveal the fact ---
  await main.locator('.rm-topic').first().click()
  await main.waitForSelector('.rm-keep', { timeout: 4000 })
  result('REVEAL_TEST', (await text(main.locator('.rm-fact-text'))).length > 20,
    `fact: "${(await text(main.locator('.rm-fact-text'))).slice(0, 60)}…"`)
  await main.screenshot({ path: path.join(shots, 'realm-modal-reveal.png') })

  // --- Add to Chronicle => region charts (4 -> 5) ---
  await main.locator('.rm-keep').click()
  await main.waitForTimeout(500)
  result('CLAIM_TEST', (await text(main.locator('.realm-hint'))).includes('5 / 15'),
    `after claim: "${await text(main.locator('.realm-hint'))}"`)

  // --- Re-read a charted region ---
  await main.locator('.realm-charted').first().click()
  await main.waitForSelector('.realm-modal.reading', { timeout: 4000 })
  result('REREAD_TEST', (await text(main.locator('.realm-modal.reading .rm-fact-text'))).length > 20,
    're-read shows the stored discovery')
  await main.screenshot({ path: path.join(shots, 'realm-reread.png') })
  await main.locator('.realm-modal.reading .rm-close').click()
  await main.waitForTimeout(300)

  // --- Completing a quest earns another expedition (celebration prompt) ---
  await main.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await main.waitForTimeout(400)
  await main.locator('.cq-complete').first().click()
  await main.waitForSelector('.celebrate-region', { timeout: 6000 })
  result('EXPEDITION_CELEBRATION_TEST',
    (await text(main.locator('.celebrate-region'))).toLowerCase().includes('expedition'),
    `celebration: "${await text(main.locator('.celebrate-region'))}"`)
  await main.screenshot({ path: path.join(shots, 'realm-celebration.png') })

  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  await app.close()
  process.exitCode = 1
}
console.log('closed (isolated dir:', isoDir + ')')
