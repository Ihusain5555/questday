// One-off: build a human-readable transcript of all Claude Code sessions for this
// project. Keeps only real user messages and assistant prose; drops tool calls,
// tool results, system reminders, and subagent sidechains.
import fs from 'node:fs'
import path from 'node:path'

const dir = 'C:/Users/ihusa/.claude/projects/C--Users-ihusa-OneDrive-Desktop-project1'
const out = 'C:/Users/ihusa/OneDrive/Desktop/project1/transcript.md'

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.jsonl'))
  .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => a.t - b.t)

const clean = (s) =>
  s
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .trim()

let md = '# QuestDay — Claude Code conversation transcript\n'
let sessionNum = 0

for (const { f } of files) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)
  let header = false
  sessionNum++
  for (const line of lines) {
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (e.isSidechain) continue
    if (e.type !== 'user' && e.type !== 'assistant') continue
    const msg = e.message
    if (!msg) continue

    let text = ''
    if (e.type === 'user') {
      if (e.isMeta) continue
      const c = msg.content
      if (typeof c === 'string') text = c
      else if (Array.isArray(c))
        text = c
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
      text = clean(text)
      // command invocations like /clear show up as tagged XML — keep readable form
      const cmd = text.match(/<command-name>(.*?)<\/command-name>/)
      if (cmd) {
        const args = text.match(/<command-args>([\s\S]*?)<\/command-args>/)
        text = `${cmd[1]}${args && args[1].trim() ? ' ' + args[1].trim() : ''}`
      }
      if (!text || text.startsWith('Caveat:')) continue
      if (header === false) {
        const when = e.timestamp ? new Date(e.timestamp).toLocaleString() : ''
        md += `\n---\n\n## Session ${sessionNum} — ${when}\n`
        header = true
      }
      md += `\n### 🧑 You\n\n${text}\n`
    } else {
      const c = msg.content
      if (!Array.isArray(c)) continue
      text = c
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      if (!text) continue
      md += `\n### 🤖 Claude\n\n${text}\n`
    }
  }
}

fs.writeFileSync(out, md, 'utf8')
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + 'KB')
