#!/usr/bin/env node
// Reads piped output from a test/build/typecheck command and prints only the lines that
// matter (failures, errors) plus a short tail. A clean run collapses to one line.
// Wired via the PreToolUse hook in .claude/settings.json (see rewrite-test-cmd.mjs).
import { createInterface } from 'node:readline'

const FAIL = /(\bFAIL\b|\berror\b|✗|×|✘|\bfailed\b|cannot find|is not assignable|\bTS\d{4,}\b|Expected|ERR!|FAIL:)/i
const TAIL = 12

const lines = []
const rl = createInterface({ input: process.stdin })
rl.on('line', (l) => lines.push(l))
rl.on('close', () => {
  const hits = lines.filter((l) => FAIL.test(l))
  if (hits.length === 0) {
    console.log(`✓ no failures detected — ${lines.length} output lines hidden by the output filter`)
    return
  }
  const tail = new Set(lines.slice(-TAIL))
  const keep = new Set([...hits, ...tail])
  const out = lines.filter((l) => keep.has(l))
  console.log(`⚠ ${hits.length} failure/error line(s); ${lines.length - out.length} other lines hidden by the output filter`)
  for (const l of out) console.log(l)
})
