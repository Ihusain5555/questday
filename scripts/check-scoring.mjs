// Pure-engine test for the deadline-aware "current quest" scorer (v1.13, task #5).
// The selection engine is pure, so we transpile+bundle it with esbuild (already a dep)
// and assert the score curve directly — far more precise than driving the UI.
//   Run: node scripts/check-scoring.mjs
import { buildSync } from 'esbuild'
import { pathToFileURL } from 'url'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const root = process.cwd()
const out = path.join(mkdtempSync(path.join(tmpdir(), 'sel-')), 'sel.mjs')
buildSync({
  entryPoints: [path.join(root, 'src/shared/engine/selectCurrentQuest.ts')],
  outfile: out,
  format: 'esm',
  bundle: true,
  platform: 'node'
})
const mod = await import(pathToFileURL(out).href)

const now = new Date('2026-06-18T12:00:00')
const base = {
  id: 'q', title: 'q', subTasks: [], difficulty: 'Medium', importance: 'Medium',
  urgency: 'Medium', timeEstimateMinutes: 30, dueAt: null, timeFrameId: 'f',
  status: 'active', createdAt: now.toISOString(), completedAt: null, sortOrder: 0
}
const iso = (hoursFromNow) => new Date(now.getTime() + hoursFromNow * 3_600_000).toISOString()
const score = (importance, urgency, dueHours, est = 30) =>
  mod.scoreQuest(
    { ...base, importance, urgency, timeEstimateMinutes: est, dueAt: dueHours === null ? null : iso(dueHours) },
    now
  )

let pass = 0
let fail = 0
const check = (name, cond, extra = '') => {
  console.log(`${name}: ${cond ? 'PASS' : 'FAIL'}${extra ? ` (${extra})` : ''}`)
  cond ? pass++ : fail++
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps

const highUndated = score('High', 'High', null).score // 2.0

// 1. Far from the deadline, importance still leads — NO early inversion.
check('NO_EARLY_INVERSION', score('Low', 'Low', 4).score < highUndated,
  `lowDue4h=${score('Low', 'Low', 4).score.toFixed(2)} < highUndated=${highUndated.toFixed(2)}`)

// 2. AT the deadline, a near-due Low/Low crosses importance and beats a non-due High/High.
check('DEADLINE_CROSSES_IMPORTANCE', score('Low', 'Low', 0).score > highUndated,
  `lowDueNow=${score('Low', 'Low', 0).score.toFixed(2)} > highUndated=${highUndated.toFixed(2)}`)

// 3. Among equally-due quests, importance still breaks the tie.
check('IMPORTANCE_BREAKS_DUE_TIE', score('High', 'High', 0).score > score('Low', 'Low', 0).score,
  `highDueNow=${score('High', 'High', 0).score.toFixed(2)} > lowDueNow=${score('Low', 'Low', 0).score.toFixed(2)}`)

// 4. A STALE overdue quest (past the overdue window) decays to its importance rank —
//    it must NOT dominate the spotlight.
check('STALE_OVERDUE_DECAYS', score('Low', 'Low', -6).score < highUndated,
  `lowOverdue6h dueSoon=${score('Low', 'Low', -6).breakdown.dueSoon.toFixed(2)} score=${score('Low', 'Low', -6).score.toFixed(2)}`)

// 5. A recently-overdue quest is still promoted above a lower-importance non-due quest.
check('RECENT_OVERDUE_STILL_PROMOTED', score('Low', 'Low', -2).score > score('Medium', 'Medium', null).score,
  `lowOverdue2h=${score('Low', 'Low', -2).score.toFixed(2)} > medUndated=${score('Medium', 'Medium', null).score.toFixed(2)}`)

// 6. Curve shape: ~0 far out, 1 at due, decaying when overdue, 0 when stale.
check('CURVE_3H_GENTLE', near(score('Low', 'Low', 3).breakdown.dueSoon, 0.125, 0.005),
  `dueSoon@3h=${score('Low', 'Low', 3).breakdown.dueSoon.toFixed(3)} (expect ~0.125)`)
check('CURVE_AT_DUE_IS_1', near(score('Low', 'Low', 0).breakdown.dueSoon, 1, 0.001),
  `dueSoon@0=${score('Low', 'Low', 0).breakdown.dueSoon.toFixed(3)}`)
check('CURVE_OVERDUE_2H_HALF', near(score('Low', 'Low', -2).breakdown.dueSoon, 0.5, 0.001),
  `dueSoon@-2h=${score('Low', 'Low', -2).breakdown.dueSoon.toFixed(3)} (expect 0.5)`)
check('CURVE_STALE_IS_0', score('Low', 'Low', -6).breakdown.dueSoon === 0,
  `dueSoon@-6h=${score('Low', 'Low', -6).breakdown.dueSoon}`)

// 7. Undated quest is unaffected; and scoreQuest with no `now` ignores the deadline.
check('UNDATED_NO_PULL', score('Medium', 'Medium', null).breakdown.dueSoon === 0)
check('NO_NOW_NO_PULL', mod.scoreQuest({ ...base, dueAt: iso(0) }).breakdown.dueSoon === 0)

// 8. End-to-end via rankCandidates: a prayer-like Medium quest due now becomes current,
//    over a higher-importance non-due quest in the same (all-day) frame.
const frame = [{ id: 'f', name: 'All day', startMinute: 0, endMinute: 1440, order: 0 }]
const quests = [
  { ...base, id: 'high', importance: 'High', urgency: 'High', dueAt: null },
  { ...base, id: 'prayer', importance: 'Medium', urgency: 'Medium', dueAt: iso(0) }
]
const current = mod.selectCurrentQuest(quests, frame, now)
check('PRAYER_SURFACES_AT_TIME', current?.id === 'prayer', `current=${current?.id}`)

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`)
process.exitCode = fail === 0 ? 0 : 1
