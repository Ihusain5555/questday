// Spin up a new QuestDay feature worktree in ONE step: create the git worktree +
// branch, then junction node_modules to the main repo's copy (so you never run
// `npm install` in a worktree — it doesn't extract electron under OneDrive; the
// shared junction sidesteps that). See CLAUDE.md "Working in parallel (git)".
//
// Usage: node scripts/new-worktree.mjs <name> [branch]
//   e.g. node scripts/new-worktree.mjs timeblock          -> feature/timeblock
//        node scripts/new-worktree.mjs ui feature/redesign
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const [name, branch = `feature/${name}`] = process.argv.slice(2)
if (!name) {
  console.error('usage: node scripts/new-worktree.mjs <name> [branch]')
  process.exit(2)
}

// The main repo dir = parent of the common .git dir; node_modules lives there.
const commonDir = spawnSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).stdout.trim()
if (!commonDir) {
  console.error('not inside a git repo')
  process.exit(1)
}
const mainRepo = path.dirname(path.resolve(commonDir))
const nodeModules = path.join(mainRepo, 'node_modules')
const wtPath = path.join('C:\\Users\\ihusa\\questday-wt', name) // matches existing worktree convention

console.log(`Creating worktree ${wtPath} on ${branch}…`)
const add = spawnSync('git', ['worktree', 'add', '-b', branch, wtPath], { stdio: 'inherit' })
if (add.status !== 0) process.exit(add.status ?? 1)

if (existsSync(nodeModules)) {
  console.log('Junctioning node_modules (shared — do NOT npm install here)…')
  spawnSync(
    'powershell',
    ['-NoProfile', '-Command', `New-Item -ItemType Junction -Path '${path.join(wtPath, 'node_modules')}' -Target '${nodeModules}' | Out-Null`],
    { stdio: 'inherit' }
  )
} else {
  console.log(`(no node_modules at ${nodeModules} to share — run npm install once in the main repo)`)
}

console.log(`\nDone. Next:\n  cd ${wtPath}\n  # start claude here; npm run typecheck works immediately (shared node_modules).`)
