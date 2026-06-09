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
// The terminal name is auto-detected (so the same script is correct in every
// worktree); override explicitly with `--as <name>` if needed.
// Usage: node scripts/with-app.mjs [--as <name>] <command> [args...]
//   e.g.  node scripts/with-app.mjs node scripts/pw-arcade.mjs
//         node scripts/with-app.mjs --as arcade electron-vite dev
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const LOCK = 'C:\\Users\\ihusa\\questday-coordination\\app-lock.mjs'
const node = process.execPath

// Which terminal am I? Env override → the folder's APP-LOCK-READ-ME.md (the name
// the coordination system assigned) → the worktree folder name → 'local'.
function detectTerminal() {
  if (process.env.QUESTDAY_TERMINAL) return process.env.QUESTDAY_TERMINAL
  try {
    const m = readFileSync('APP-LOCK-READ-ME.md', 'utf8').match(/terminal name here:\s*`([^`]+)`/i)
    if (m) return m[1].trim()
  } catch {
    /* no readme — fall through */
  }
  return path.basename(process.cwd()).replace(/^questday-/, '') || 'local'
}

let args = process.argv.slice(2)
let terminal
if (args[0] === '--as') {
  terminal = args[1]
  args = args.slice(2)
} else {
  terminal = detectTerminal()
}
const cmd = args

if (!terminal || cmd.length === 0) {
  console.error('usage: node scripts/with-app.mjs [--as <name>] <command> [args...]')
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
