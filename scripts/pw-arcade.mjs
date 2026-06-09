// Playwright driver — 🧠 Arcade brain-training trio (Color Clash / Flash Recall
// / N-Back). Self-contained: seeds an active quest + arcade tickets, then drives
// each new game and asserts it launches, plays, and cashes out with a payout.
// Lives separately from pw-run.mjs so the arcade and Focus suites never clobber
// each other (one driver per feature — see CLAUDE.md "Working in parallel").
// Stashes/restores the real db.json.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'fs'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })

const d = new Date()
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
const pad = (n) => String(n).padStart(2, '0')
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`

// Seed: enough tickets to play all three new games in one run (the games are the
// feature under test here, not the ticket economy — that's covered elsewhere).
const seed = {
  version: 1,
  quests: [
    {
      id: 'q-act', title: 'Play a quick round', subTasks: [], difficulty: 'Easy', priority: 'High',
      skippability: 'Must do', timeEstimateMinutes: 10, dueAt: null, timeFrameId: activeFrame.id,
      status: 'active', createdAt: d.toISOString(), completedAt: null, sortOrder: 0
    }
  ],
  timeFrames: frames,
  player: { xp: 0, level: 3, currency: 100, streakCount: 0, lastCompletionDate: null, arcadeTickets: 5 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0 },
  settings: {
    activeModeEnabled: false,
    activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
    distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
    widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5
  },
  lastSeenDate: ymd(d)
}

const userData = path.join(process.env.APPDATA, 'questday')
mkdirSync(userData, { recursive: true })
const dbPath = path.join(userData, 'db.json')
const stashPath = path.join(userData, 'db.json.pw-stash')
if (existsSync(dbPath)) copyFileSync(dbPath, stashPath)
writeFileSync(dbPath, JSON.stringify(seed, null, 2))

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

try {
  const app = await electron.launch({ args: [root], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1800))
  const main = app.windows().find((w) => w.url().includes('index.html'))

  await main.getByRole('button', { name: 'Arcade' }).click()
  await main.waitForTimeout(400)
  const cards = main.locator('.arcade-card')
  result('ARCADE_CARDS_TEST', (await cards.count()) === 14, `${await cards.count()} games (want 14)`)
  await main.screenshot({ path: path.join(shots, 'arcade.png') })

  const playGame = (name) => main.locator('.arcade-card', { hasText: name }).getByRole('button').click()
  const endRound = () => main.locator('.game-hud button', { hasText: 'End round' }).click()
  const resultText = async () => (await main.locator('.arcade-result').textContent()) ?? ''

  // Color Clash (Stroop): tap the swatch whose colour matches the WORD's ink.
  // Read the ink's computed colour, click the matching swatch -> guaranteed hits.
  // (Wait out the "Ready" countdown — the word/swatches appear once play starts.)
  await playGame('Color Clash')
  await main.locator('.cc-swatch').first().waitFor({ timeout: 5000 })
  result('COLORCLASH_LAUNCH_TEST', (await main.locator('.cc-word').count()) === 1, 'Stroop word rendered')
  for (let i = 0; i < 6; i++) {
    const ink = await main.locator('.cc-word').evaluate((el) => getComputedStyle(el).color)
    const swatches = main.locator('.cc-swatch')
    const n = await swatches.count()
    let clicked = false
    for (let s = 0; s < n; s++) {
      const bg = await swatches.nth(s).evaluate((el) => getComputedStyle(el).backgroundColor)
      if (bg === ink) {
        await swatches.nth(s).click()
        clicked = true
        break
      }
    }
    if (!clicked) await swatches.first().click()
    await main.waitForTimeout(140)
  }
  await main.screenshot({ path: path.join(shots, 'arcade-colorclash.png') })
  await endRound()
  await main.waitForTimeout(500)
  result('COLORCLASH_PLAY_TEST',
    (await resultText()).includes('Color Clash') && (await resultText()).includes('new best'),
    `result: "${(await resultText()).trim()}" (6 ink-matching taps -> scored + best)`)

  // Flash Recall (UFOV): the flash is only ~400ms — poll in-page with rAF so we
  // catch the lit cell the frame it appears; -1 means we missed it (stuck in
  // "respond") -> click to advance and the next flash gets caught (self-healing).
  await playGame('Flash Recall')
  await main.waitForTimeout(300)
  result('FLASHRECALL_LAUNCH_TEST', (await main.locator('.ufov-field').count()) === 1, 'UFOV ring rendered')
  let correct = 0
  for (let attempt = 0; attempt < 12 && correct < 3; attempt++) {
    const litIdx = await main.evaluate(
      () =>
        new Promise((resolve) => {
          const t0 = performance.now()
          const tick = () => {
            const cells = [...document.querySelectorAll('.ufov-cell')]
            const i = cells.findIndex((e) => e.classList.contains('lit'))
            if (i >= 0) return resolve(i)
            if (performance.now() - t0 > 2000) return resolve(-1)
            requestAnimationFrame(tick)
          }
          tick()
        })
    )
    if (litIdx < 0) {
      await main.locator('.ufov-cell').first().click().catch(() => {})
      await main.waitForTimeout(650)
      continue
    }
    await main.locator('.ufov-caption', { hasText: 'Where was it' }).waitFor({ timeout: 2500 }).catch(() => {})
    await main.locator('.ufov-cell').nth(litIdx).click()
    correct++
    await main.waitForTimeout(650)
  }
  await main.screenshot({ path: path.join(shots, 'arcade-flashrecall.png') })
  await endRound()
  await main.waitForTimeout(500)
  result('FLASHRECALL_PLAY_TEST',
    (await resultText()).includes('Flash Recall') && (await resultText()).includes('new best'),
    `result: "${(await resultText()).trim()}" (3 correct localisations)`)

  // N-Back: verify it launches (3x3 grid + Match button) and cashes out cleanly.
  await playGame('N-Back')
  await main.waitForTimeout(400)
  result('NBACK_LAUNCH_TEST',
    (await main.locator('.nback-cell').count()) === 9 && (await main.locator('.nback-btn').count()) === 1,
    '3x3 grid + Match button rendered')
  await main.screenshot({ path: path.join(shots, 'arcade-nback.png') })
  await endRound()
  await main.waitForTimeout(500)
  result('NBACK_PLAY_TEST', (await resultText()).includes('N-Back'), `result: "${(await resultText()).trim()}"`)

  await app.close()
} finally {
  if (existsSync(stashPath)) {
    copyFileSync(stashPath, dbPath)
    rmSync(stashPath)
    console.log('restored real db.json from stash')
  }
}
console.log('closed')
