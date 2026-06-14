// Injects the 8 workflow-generated town clusters into the base map at the <!--TOWNS--> marker.
//   node scripts/assemble-map.mjs <towns-output.json> <base.html> <out.html>
import { readFile, writeFile } from 'node:fs/promises'

const [, , townsPath, basePath, outPath] = process.argv
const raw = await readFile(townsPath, 'utf8')
const parsed = JSON.parse(raw)
const towns = Array.isArray(parsed) ? parsed : (parsed.result || [])
if (!towns.length) { console.error('No towns found in', townsPath); process.exit(1) }

const decode = s => (s || '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

const blocks = towns.map(t =>
  `      <!-- TOWN: ${t.name} — ${(t.notes || '').replace(/-->/g, '')} -->\n      <g class="region"><g class="lift">${decode(t.svg)}</g></g>`
).join('\n')

let base = await readFile(basePath, 'utf8')
if (!base.includes('<!--TOWNS-->')) { console.error('Marker <!--TOWNS--> not found in base'); process.exit(1) }
base = base.replace('<!--TOWNS-->', blocks)
await writeFile(outPath, base, 'utf8')
console.log(`Injected ${towns.length} towns -> ${outPath}`)
