// Throwaway art-review helper: sends a mockup screenshot to the Gemini API and
// prints an independent art critique. Zero npm deps (Node 18+ global fetch).
//
//   node scripts/gemini-critique.mjs [imagePath]
//
// API key resolution order:
//   1) GEMINI_API_KEY environment variable
//   2) scripts/.gemini-key.txt  (gitignored — paste your key there)
// Get a free key at https://aistudio.google.com/apikey

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGE = resolve(process.argv[2] || join(__dirname, '..', 'map-for-review.png'))
// Cascade: newest first, fall back if a model isn't on your tier.
const MODELS = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [])
  .concat(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'])

const PROMPT = `You are a senior art director reviewing fantasy map art for a cozy productivity app.
This is a STORYBOOK-PARCHMENT world map ("Terra Questa") built as hand-drawn SVG — intentionally
warm, friendly, picture-book, NOT photoreal. It is free placeholder vector art; a painted upgrade is planned later.

Critique it honestly and specifically as cartographic illustration. Cover:
1. Does it read as ORGANIC / hand-made, or are there spots that still look mechanical, gridded, or "AI-generated"? Name exact areas.
2. Composition & balance: density spread, empty vs busy regions, focal hierarchy (is the home settlement clearly the heart?).
3. Palette / color cohesion and any tones that clash or feel flat.
4. Terrain believability: forests, fields, mountains, rivers, roads, coastline, the ocean and its creatures.
5. The single most distracting flaw.

Then give: STRENGTHS (bullets), WEAKNESSES (bullets), TOP 5 CONCRETE FIXES (ranked, each one specific & actionable),
and an OVERALL SCORE out of 10 for "reads as charming organic storybook cartography". Be blunt; skip flattery.`

async function main() {
  let key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    try { key = (await readFile(join(__dirname, '.gemini-key.txt'), 'utf8')).trim() } catch {}
  }
  if (!key || key === 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
    console.error('No API key. Open scripts/.gemini-key.txt and paste your key (free: https://aistudio.google.com/apikey), or set GEMINI_API_KEY.')
    process.exit(1)
  }

  let data
  try { data = (await readFile(IMAGE)).toString('base64') }
  catch { console.error(`Could not read image: ${IMAGE}`); process.exit(1) }

  const body = JSON.stringify({
    contents: [{ parts: [{ inline_data: { mime_type: 'image/png', data } }, { text: PROMPT }] }],
  })

  const RETRYABLE = new Set([429, 500, 502, 503, 504]) // transient: overloaded / rate-limited / gateway
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  let lastErr = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) { console.error(`(retry ${attempt} after: ${lastErr.slice(0, 90)})`); await sleep(attempt * 4000) }
    let sawRetryable = false
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      let res
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body })
      } catch (e) { lastErr = `${model}: fetch error ${e.message}`; sawRetryable = true; continue }
      if (res.ok) {
        const json = await res.json()
        const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n')
        console.log(`\n===== Gemini (${model}) critique of ${IMAGE.split(/[\\/]/).pop()} =====\n`)
        console.log(text || JSON.stringify(json, null, 2))
        return
      }
      lastErr = `${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`
      if (res.status === 404) continue                 // model not on this tier → try next model
      if (RETRYABLE.has(res.status)) { sawRetryable = true; continue } // transient → next model, then retry round
      console.error('Gemini request failed (non-retryable).\n' + lastErr); process.exit(1)
    }
    if (!sawRetryable) break
  }
  console.error('Gemini request failed after retries.\n' + lastErr)
  process.exit(1)
}

main()
