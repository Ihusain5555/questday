// TEMP layout checker (delete after): verifies no two region "charted footprints"
// (landmark icon box + name-banner box) overlap, for ANY combination of charted
// regions. Footprint = union of icon box and banner box, inflated by MARGIN.
// Mirrors the geometry in RealmView.tsx (icon size + banner half-width formula).

const ICON = 52
const TOWN = 76 // hero-town <symbol> footprint (vs 52px terrain icons)
// Regions drawn as hand-authored hero TOWNS (76px) instead of a simple icon.
// Must mirror TOWN_ART in RealmView.tsx — grow this as each batch ships.
// Live: larkholt, goldfield, sunmeadow, greymoor, tidesend, quietfens.
// Capital (embergreen) deferred — stays a forest for now.
const TOWNS = new Set(['goldfield', 'sunmeadow', 'larkholt', 'greymoor', 'tidesend', 'quietfens'])
const sizeOf = (r) => (TOWNS.has(r.id) ? TOWN : ICON)
const ICON_TOP = (r) => r.ly - sizeOf(r) * 0.86 // <use> y = y - size*0.86
const bannerHalf = (name) => Math.max(30, name.length * 4.2 + 10) + 11 // +11 swallowtail tip
const LABEL_DY = 40 // ty = ly + 40
const MARGIN = 6 // required clear gap (each box inflated by MARGIN)
const VBW = 1200
const FRAME = 54 // gold inner frame inset (content should stay within [54, 1146])

// Candidate layout — edit (lx, ly) and re-run until "COLLISIONS: 0".
const R = [
  { id: 'embergreen', name: 'Vale of Embergreen', lx: 360, ly: 350 },
  { id: 'goldfield', name: 'Goldfield March', lx: 600, ly: 240 },
  { id: 'sunmeadow', name: 'Sunmeadow Hold', lx: 815, ly: 210 },
  { id: 'larkholt', name: 'Larkholt', lx: 600, ly: 600 },
  { id: 'tidesend', name: "Tide's End", lx: 270, ly: 485 },
  { id: 'crownspire', name: 'Crownspire Peaks', lx: 820, ly: 345 },
  { id: 'rivenwood', name: 'Rivenwood Reach', lx: 600, ly: 360 },
  { id: 'palevale', name: 'Pale Vale', lx: 410, ly: 215 },
  { id: 'greymoor', name: 'Greymoor', lx: 770, ly: 480 },
  { id: 'quietfens', name: 'Quiet Fens', lx: 420, ly: 600 },
  { id: 'mistisles', name: 'Mist Isles', lx: 995, ly: 360 },
  { id: 'hollowreach', name: 'Hollow Reach', lx: 210, ly: 648 },
  { id: 'sunkenmarsh', name: 'Sunken Marsh', lx: 790, ly: 600 },
  { id: 'ashlands', name: 'The Ashlands', lx: 470, ly: 470 },
  { id: 'beyondveil', name: 'Beyond the Veil', lx: 1052, ly: 610 }
]

const box = (r) => {
  const s = sizeOf(r)
  const hw = bannerHalf(r.name)
  const x0 = Math.min(r.lx - s / 2, r.lx - hw) - MARGIN
  const x1 = Math.max(r.lx + s / 2, r.lx + hw) + MARGIN
  const y0 = ICON_TOP(r) - MARGIN
  const ty = r.ly + LABEL_DY
  const y1 = ty + 12 + MARGIN
  return { x0, x1, y0, y1 }
}
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

// Fixed chrome the markers must also avoid: compass (600,126 r34) + title (600,56).
const OBSTACLES = [
  { id: 'compass', x0: 566 - MARGIN, x1: 634 + MARGIN, y0: 92 - MARGIN, y1: 160 + MARGIN },
  { id: 'title', x0: 434 - MARGIN, x1: 766 + MARGIN, y0: 34 - MARGIN, y1: 78 + MARGIN }
]

let collisions = 0
for (let i = 0; i < R.length; i++) {
  for (let j = i + 1; j < R.length; j++) {
    if (overlap(box(R[i]), box(R[j]))) {
      collisions++
      console.log(`COLLIDE: ${R[i].id} <-> ${R[j].id}`)
    }
  }
  for (const o of OBSTACLES) {
    if (overlap(box(R[i]), o)) {
      collisions++
      console.log(`COLLIDE: ${R[i].id} <-> ${o.id} (chrome)`)
    }
  }
}
// Frame/edge bleed check (banner extends past the gold inner frame or off-canvas).
for (const r of R) {
  const b = box(r)
  if (b.x0 < FRAME || b.x1 > VBW - FRAME) {
    console.log(`EDGE: ${r.id} banner x[${Math.round(b.x0)},${Math.round(b.x1)}] outside frame [${FRAME},${VBW - FRAME}]`)
  }
}
console.log(`COLLISIONS: ${collisions} / ${R.length} regions`)
