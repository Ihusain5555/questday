// Dev helper: split `git diff <file>` into one patch per hunk (each with the file header)
// so per-feature commits can stage individual hunks via `git apply --cached`.
// Usage: node scripts/_split-diff.cjs <file>  -> writes <tmp>/<base>.h<N>.patch, prints paths.
const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const file = process.argv[2]
const diff = execSync(`git -c core.safecrlf=false diff -- "${file}"`, { encoding: 'utf8', maxBuffer: 1e8 })
const lines = diff.split('\n')

let i = 0
const header = []
while (i < lines.length && !lines[i].startsWith('@@')) {
  header.push(lines[i])
  i++
}

const base = path.basename(file)
const written = []
let h = 0
while (i < lines.length) {
  if (!lines[i].startsWith('@@')) {
    i++
    continue
  }
  const hunk = [lines[i]]
  i++
  while (i < lines.length && !lines[i].startsWith('@@')) {
    hunk.push(lines[i])
    i++
  }
  // Trim trailing blank lines that the split introduced, keep exactly one final newline.
  while (hunk.length && hunk[hunk.length - 1] === '') hunk.pop()
  const out = path.join(os.tmpdir(), `${base}.h${h}.patch`)
  fs.writeFileSync(out, header.join('\n') + '\n' + hunk.join('\n') + '\n')
  written.push(`h${h} -> ${out}`)
  h++
}
console.log(written.join('\n'))
