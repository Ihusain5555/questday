// Playwright driver — Town Editing v1, BUILD STEP 2: the `townLayouts` data layer.
// NO UI yet — this verifies the PERSISTENCE plumbing only, end-to-end through the real
// main-process store: renderer → IPC (store:save / store:getState) → applyPatch → validate
// → atomic persist → migrate-on-reload. Isolated --user-data-dir; the real
// %APPDATA%\questday\db.json is NEVER touched (asserted by ISOLATION).
//
// Verifies:
//   ISOLATION           — the app's userData IS the temp dir (real save safe).
//   DEFAULT_EMPTY       — a fresh DB exposes townLayouts === {}.
//   PERSIST_ROUNDTRIP   — saving an override returns it on getState AND lands on disk.
//   WHOLESALE_REPLACE   — a second save REPLACES (not deep-merges) the whole map.
//   RESET_OMITS_TOWN    — saving the map without a town drops only that town (= reset).
//   SIBLING_SAFE        — an unrelated patch (player) does NOT clobber townLayouts.
//   MALFORMED_REJECT    — a bad townLayouts patch is REJECTED; prior state stays intact.
//   MIGRATION_TOLERANCE — an OLD save with no townLayouts loads as {} (no crash).
//   RESTART_PERSIST     — an override survives an app restart (same isolated dir).
import { _electron as electron } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()

const frames = [
  { id: 'tf-morning', name: 'Morning', startMinute: 300, endMinute: 720, order: 0 },
  { id: 'tf-midday', name: 'Midday', startMinute: 720, endMinute: 1020, order: 1 },
  { id: 'tf-evening', name: 'Evening', startMinute: 1020, endMinute: 1260, order: 2 },
  { id: 'tf-night', name: 'Night', startMinute: 1260, endMinute: 300, order: 3 }
]

const settings = {
  activeModeEnabled: false,
  activeModeTiers: { awareness: true, nudge: false, softFriction: false, hardBlock: false },
  distractingApps: [], reminderIntervalMin: 30, frameEndingLeadMin: 10, nudgeSnoozeMin: 15,
  widgetBounds: null, widgetExpanded: false, launchOnLogin: false, blockBreakPassMin: 5,
  focusPreset: 'pomodoro', enabledFeatures: { focus: true, matrix: true, world: true },
  realmChronicle: []
}

// `withLayouts` controls whether the seed includes townLayouts (omit = simulate an OLD save).
const seed = (withLayouts) => {
  const base = {
    version: 1,
    quests: [],
    timeFrames: frames,
    player: { xp: 0, level: 1, currency: 0, streakCount: 0, lastCompletionDate: null, arcadeTickets: 0 },
    garden: { theme: 'garden', items: [], visitors: [], bestStreak: 0 },
    arcade: { best: {}, ticketsEarnedOn: null, ticketsEarnedCount: 0, freeGrantedOn: null },
    settings,
    lastSeenDate: null
  }
  if (withLayouts) base.townLayouts = {}
  return base
}

const result = (name, pass, extra = '') =>
  console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)

function isoDirFor(name) {
  const dir = path.join(tmpdir(), name)
  mkdirSync(dir, { recursive: true })
  return dir
}

async function launch(dir, seedObj) {
  if (seedObj) writeFileSync(path.join(dir, 'db.json'), JSON.stringify(seedObj, null, 2))
  const app = await electron.launch({ args: [root, `--user-data-dir=${dir}`], cwd: root })
  const first = await app.firstWindow()
  await first.waitForLoadState('domcontentloaded')
  await new Promise((r) => setTimeout(r, 1500))
  const main = app.windows().find((w) => w.url().includes('index.html'))
  const userData = await app.evaluate(async ({ app }) => app.getPath('userData'))
  return { app, main, userData }
}

// renderer-context helpers (window.questday lives in the main window)
const save = (main, patch) => main.evaluate((p) => window.questday.saveState(p), patch)
const getState = (main) => main.evaluate(() => window.questday.getState())
const saveExpectReject = (main, patch) =>
  main.evaluate(async (p) => {
    try { await window.questday.saveState(p); return { rejected: false } }
    catch (e) { return { rejected: true, msg: String((e && e.message) || e) } }
  }, patch)

const OV_A = { greenhaven: { overrides: { 1: { cell: 5, kind: 'tavern' } } } }
const OV_B = { greenhaven: { overrides: { 2: { kind: 'house' } } }, goldfield: { overrides: { 3: { cell: 9 } } } }

try {
  // ===== Run 1: a save that includes the townLayouts key =====
  const dir1 = isoDirFor('questday-iso-townlayouts-1')
  let { app, main, userData } = await launch(dir1, seed(true))

  result('ISOLATION', userData.toLowerCase() === dir1.toLowerCase(), `userData=${userData}`)

  const def = await getState(main)
  result('DEFAULT_EMPTY', !!def && !!def.townLayouts && Object.keys(def.townLayouts).length === 0,
    `townLayouts=${JSON.stringify(def && def.townLayouts)}`)

  // PERSIST_ROUNDTRIP — memory + disk
  await save(main, { townLayouts: OV_A })
  const a = (await getState(main)).townLayouts
  const memOk = a && a.greenhaven && a.greenhaven.overrides && a.greenhaven.overrides['1']
    && a.greenhaven.overrides['1'].kind === 'tavern' && a.greenhaven.overrides['1'].cell === 5
  const onDisk = JSON.parse(readFileSync(path.join(dir1, 'db.json'), 'utf-8'))
  const diskOk = onDisk.townLayouts && onDisk.townLayouts.greenhaven
    && onDisk.townLayouts.greenhaven.overrides['1'].kind === 'tavern'
  result('PERSIST_ROUNDTRIP', !!memOk && !!diskOk, `mem=${JSON.stringify(a)} disk=${!!diskOk}`)

  // WHOLESALE_REPLACE — OV_B fully replaces OV_A (idx 1 gone, idx 2 + goldfield present)
  await save(main, { townLayouts: OV_B })
  const b = (await getState(main)).townLayouts
  const replaced = b.greenhaven && b.greenhaven.overrides['2'] && !b.greenhaven.overrides['1']
    && b.goldfield && b.goldfield.overrides['3']
  result('WHOLESALE_REPLACE', !!replaced, `after=${JSON.stringify(b)}`)

  // RESET_OMITS_TOWN — saving the map without greenhaven removes only greenhaven
  await save(main, { townLayouts: { goldfield: OV_B.goldfield } })
  const r = (await getState(main)).townLayouts
  result('RESET_OMITS_TOWN', !r.greenhaven && !!r.goldfield, `after=${JSON.stringify(r)}`)

  // SIBLING_SAFE — an unrelated patch must not wipe townLayouts
  await save(main, { player: { xp: 123 } })
  const sib = await getState(main)
  result('SIBLING_SAFE', !!sib.townLayouts.goldfield && sib.player.xp === 123,
    `townLayouts=${JSON.stringify(sib.townLayouts)} xp=${sib.player.xp}`)

  // MALFORMED_REJECT — array + missing-overrides are rejected; prior state intact
  const badArray = await saveExpectReject(main, { townLayouts: [] })
  const badShape = await saveExpectReject(main, { townLayouts: { greenhaven: {} } })
  const intact = (await getState(main)).townLayouts.goldfield
  result('MALFORMED_REJECT', badArray.rejected && badShape.rejected && !!intact,
    `array=${badArray.rejected} missingOverrides=${badShape.rejected} priorIntact=${!!intact}`)

  await app.close()

  // ===== Run 2: MIGRATION_TOLERANCE — an OLD save with NO townLayouts key =====
  const dir2 = isoDirFor('questday-iso-townlayouts-2')
  ;({ app, main } = await launch(dir2, seed(false)))
  const mig = (await getState(main)).townLayouts
  result('MIGRATION_TOLERANCE',
    !!mig && typeof mig === 'object' && !Array.isArray(mig) && Object.keys(mig).length === 0,
    `townLayouts=${JSON.stringify(mig)}`)
  await save(main, { townLayouts: OV_A }) // seed an override, then restart
  await app.close()

  // ===== Run 3: RESTART_PERSIST — relaunch SAME dir (no reseed); override survived =====
  ;({ app, main } = await launch(dir2, null))
  const re = (await getState(main)).townLayouts
  result('RESTART_PERSIST',
    !!re && re.greenhaven && re.greenhaven.overrides['1'].kind === 'tavern',
    `townLayouts=${JSON.stringify(re)}`)
  await app.close()
} catch (err) {
  console.log('ERROR:', err?.message ?? err)
  process.exitCode = 1
}
console.log('closed')
