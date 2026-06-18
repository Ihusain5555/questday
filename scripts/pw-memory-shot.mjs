// Throwaway shot driver — capture the overhauled Memory Match (v1.13) for visual review.
// Launches the built app (isolated dir, seeded tickets), plays Memory Match on the
// default (Medium = 12 pairs), and screenshots the board + a couple revealed cards.
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const shots = path.join(root, 'pw-shots')
mkdirSync(shots, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: {}, realmChronicle: []
}
const seed = {
  version: 1, quests: [], timeFrames: [],
  player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 5 },
  garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
  arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
  settings, townLayouts: {}, questTemplates: [], dailyNotes: {}, lastSeenDate: null
}

const dir = path.join(tmpdir(), 'questday-iso-memshot')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seed, null, 2))

let app
try {
  app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  await (await app.firstWindow()).waitForLoadState('domcontentloaded')
  await sleep(1800)
  const main = app.windows().find((w) => w.url().includes('index.html'))
  await main.getByRole('button', { name: 'Arcade', exact: true }).click()
  await sleep(400)
  await main.locator('.arcade-card', { hasText: 'Memory Match' }).getByRole('button', { name: 'Play' }).click()
  // ready countdown (~3 ticks @700ms) -> playing
  await main.waitForSelector('.memory-board', { timeout: 8000 })
  await sleep(400)
  await main.screenshot({ path: path.join(shots, 'memory-board.png') })
  console.log('cards:', await main.locator('.memory-card').count())

  // Flip two cards to reveal the colourful faces, then shoot before the flip-back.
  const cards = main.locator('.memory-card')
  await cards.nth(0).click()
  await cards.nth(1).click()
  await sleep(250)
  await main.screenshot({ path: path.join(shots, 'memory-revealed.png') })
  console.log('shot done')
} catch (err) {
  console.log('ERROR:', err?.stack ?? err?.message ?? err)
  process.exitCode = 1
} finally {
  if (app) await app.close()
}
console.log('closed')
