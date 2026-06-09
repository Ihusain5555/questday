// Run something that OPENS QuestDay, safely — in one step, so no terminal ever
// forgets the cross-terminal coordination dance. It:
//   1) claims the shared app-lock (if the coordination setup is present),
//   2) kills any stray QuestDay/electron (the OS single-instance lock would
//      otherwise make our launch quit instantly),
//   3) runs the given command,
//   4) ALWAYS releases the lock (even on failure/throw).
//
// Degrades gracefully on a solo clone with no coordination dir — it just kills
// strays and runs. See CLAUDE.md "Working in parallel (git)".
//
// Usage: node scripts/with-app.mjs <terminal-name> <command> [args...]
//   e.g.  node scripts/with-app.mjs arcade node scripts/pw-arcade.mjs
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const LOCK = 'C:\\Users\\ihusa\\questday-coordination\\app-lock.mjs'
const node = process.execPath
const [terminal, ...cmd] = process.argv.slice(2)

if (!terminal || cmd.length === 0) {
  console.error('usage: node scripts/with-app.mjs <terminal-name> <command> [args...]')
  process.exit(2)
}

const hasLock = existsSync(LOCK)
const lock = (action) =>
  hasLock ? (({ stdout = '', stderr = '' }) => stdout + stderr)(spawnSync(node, [LOCK, action, terminal], { encoding: 'utf8' })) : ''

if (hasLock) {
  const out = lock('claim')
  process.stdout.write(out)
  if (/BUSY/i.test(out)) {
    console.error('\nAnother terminal holds the app — try again shortly. (Nothing to release.)')
    process.exit(1)
  }
} else {
  console.log('(no shared app-lock found — running solo)')
}

// Clear stray instances so the single-instance lock doesn't bounce our launch.
spawnSync('powershell', ['-NoProfile', '-Command', 'Get-Process QuestDay,electron -ErrorAction SilentlyContinue | Stop-Process -Force'], {
  stdio: 'ignore'
})

let code = 1
try {
  code = spawnSync(cmd.join(' '), { stdio: 'inherit', shell: true }).status ?? 1
} finally {
  const out = lock('release')
  if (out) process.stdout.write(out)
}
process.exit(code)
