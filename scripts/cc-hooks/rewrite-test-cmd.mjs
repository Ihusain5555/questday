#!/usr/bin/env node
// PreToolUse hook: when a test/build/typecheck/playwright command runs, rewrite it to pipe
// output through filter-output.mjs so only failures reach the model. No-op for everything else.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const filter = join(dirname(fileURLToPath(import.meta.url)), 'filter-output.mjs')

let cmd = ''
try { cmd = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '' } catch {}

const MATCH = /\b(npm run (typecheck|build|pw[:\w-]*)|npm test|tsc\b|electron-vite build|playwright|node scripts[\\/]pw)/i

if (cmd && MATCH.test(cmd) && !cmd.includes('filter-output.mjs')) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      updatedInput: { command: `${cmd} 2>&1 | node "${filter}"` }
    }
  }))
}
process.exit(0)
