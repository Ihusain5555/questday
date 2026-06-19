# Realm Map — Complete Art-Recreation Brief ("Terra Questa")

**Purpose:** A precise, self-contained description of QuestDay's in-app Realm world map (the
approved *Inked Watercolor* look) so an AI — image model **or** an AI authoring SVG — can recreate
the art faithfully, then push it **better**. Ground truth = `mockups/world-map-final.html`,
productionized as `src/renderer/app/RealmView.tsx`.

> One-line pitch: **An antique pen-and-ink fantasy atlas, hand-lettered, painted in soft
> watercolor washes on aged parchment — and quietly *alive* (boats sail, sea-creatures dive,
> wind drifts).** Warm, storybook, cozy. Never grimdark, never sci-fi, never punishing.

---

## 0. The single most important things to get right

1. **Medium:** flat vector cartography with a *hand-drawn* wobble — NOT a glossy 3D render, NOT a
   photoreal painting. Crisp enough to read at thumbnail size.
2. **Ink is sepia, never black.** Every outline is warm brown (`#5a4a2e`, `#6b5236`, `#3e3326`).
3. **Three stacked layers** make the look: (a) ink line-art on top, (b) soft watercolor washes
   underneath, (c) a faint paper-grain noise overlaid on everything.
4. **Every settlement is a tiny illustrated TOWN cluster** (buildings + paths + trees), not a map dot.
5. **The map is gains-only and cozy.** No ruins-as-decay, no darkness, no war damage beyond one
   *charming* half-ruined watchtower. Tone = warm and inviting.
6. **It moves, seamlessly.** Subtle ambient motion that *never* teleports/snaps on loop.

---

## 1. Canvas & format

- **Aspect / viewBox:** `1200 × 820` (landscape atlas page, ~3:2).
- **Output:** ideally layered vector SVG. If raster, render large (≥2400px wide) so ink stays sharp.
- **Reading distance:** must work both full-screen AND shrunk to a small in-app panel.

---

## 2. Color palette (lock these)

| Role | Hex(es) | Notes |
|---|---|---|
| **Parchment (land)** | `#f6eed4` → `#ecdfba` → `#ddca9c` | warm radial, light center → tan edges (aged paper) |
| **Sea** | `#bfe0e0` → `#90c0c4` → `#6ba0a6` | soft teal radial, light center → deeper rim |
| **Gold (frame, banners, sun-accents)** | `#fbeec0` → `#e6be63` → `#b98a2e` | diagonal gradient |
| **Ink lines** | `#5a4a2e`, `#6b5236`, `#3e3326` | warm sepia — the "pen". **Never `#000`.** |
| **Roof — terracotta** | `#cf7f50` | warm clay red-orange |
| **Roof — gold/straw** | `#f7d98a`, `#ecdfba`, `#f0e3bc` | thatch/gold tiles |
| **Walls / stone** | `#ddd2bb`, `#d7cdb6` | pale warm stone |
| **Doors / windows / trim** | `#cf9a3a` | amber |
| **Foliage** | `#74a84e`, `#83b257`, `#86b85c` | three greens for variety |
| **Foliage outline / stems** | `#4f7e3a`, `#6a5a36` | |
| **Water features (lakes/rivers/ponds)** | fill `#8fc0c4`, stroke `#5f9aa0` | |
| **Heather / moor accents** | `#9b86a8`, `#b59ec0` | muted purple (Greymoor only) |
| **Flag red / compass N** | `#c0532b` | |
| **Banner pennant green** | `#76a455` | |
| **Border ring (mountains)** | `#c08056` fill, `#a06642` stroke | rust |

Mood: **warm, sun-faded, friendly.** Greens lean spring not jungle; teal is hazy not tropical.

---

## 3. Texture & rendering technique

The "hand-made" feel comes from four effects layered over clean shapes:

- **Paper grain:** fine fractal-noise speckle (sepia tint) at ~35% opacity, `overlay` blend, across
  the whole page. Gives parchment "tooth."
- **Rough/wobble:** coastlines, rivers, mountains, and town outlines are run through a gentle
  turbulence-displacement so no edge is perfectly straight — a few pixels of hand-drawn jitter.
- **Watercolor washes:** broad regional color (forest green, gold farmland, moor purple, fen teal)
  painted as **blurred, soft-edged blobs** that bleed slightly past their region — clipped to the
  landmass so color never spills into the sea.
- **Mountain hatching:** 45° fine-line hatch on the shadowed faces of peaks (engraving style).

Linework: variable-ish weight, mostly thin (≈0.7–2 px at this scale), confident single strokes,
slightly rounded joins. Think *dip-pen on an old explorer's chart*.

---

## 4. Composition / layout (top to bottom, back to front)

1. **Sea** fills the whole page (teal radial). Faint darker current-blobs near left & right edges.
2. **One central continent** — a single irregular, hand-drawn landmass roughly filling the middle
   60–70% of the page, plus **4 small offshore islands** (NE "Mist Isles", and three minor capes).
3. **Cartographer's depth lines:** 2 concentric teal outlines echoing the coastline just offshore
   (classic antique-map "the land radiates rings" convention).
4. **Regional watercolor washes** inside the land (see §6 biomes).
5. **Rivers** (4) drawn first, winding under everything; a **central lake "Heartmere."**
6. **Terrain detail** per region: hills, groves, moor tarn + crags + heather, marsh ponds + reeds.
7. **Crownspire Peaks** — a hatched mountain range in the NE-center, snow-capped, sitting on the land.
8. **8 town clusters** (see §5) placed across the continent.
9. **Ocean life & vessels** (animated — see §7) in the surrounding sea.
10. **Decorative frame:** a **rust mountain-ring border** on all four edges + an **inner gold
    rectangle** rule inside it.
11. **Ornate compass rose**, top-center, just under the title.
12. **Title cartouche** top-center: **"TERRA QUESTA"** / italic subtitle **"An Atlas of Your Realm."**
13. **Labels:** each town named in a small-caps serif inside a **swallowtail banner** (gold-edged
    cream ribbon with notched ends); minor features (Tide's End, Quiet Fens, Mist Isles, Heartmere)
    in plain italic serif; sea labels ("THE TIDES", "here be wonders") in faint spaced italic.

---

## 5. The 8 settlements (each a full illustrated town, ~hover-liftable)

Positions are approximate (on the 1200×820 canvas). Each town = a little cluster of buildings on
short **dotted dirt paths**, with 2–3 trees/bushes for life. A "hero building" anchors each.

| # | Town | Where | Hero building | Cluster contents |
|---|------|-------|---------------|------------------|
| 1 | **Greenhaven Heartland** *(CAPITAL — biggest)* | center (~600,460) | Walled **twin-tower citadel** with banner + a **spired cathedral** | ~6 varied gold/terracotta houses, crenellated gate wall, market square with a **well** and a stall, a pond, 3 trees |
| 2 | **Goldfield March** | N (~556,240) | 4-sail **windmill** on a stone base | 2 long gold barns, 4 cottages, 2 hay/grain stacks, dotted paths, 3 trees |
| 3 | **Sunmeadow Hold** | NE (~772,260) | Crenellated **castle keep** with green pennant + 2 flanking towers | ring of 5 cottages, low stone wall, paths, trees |
| 4 | **Larkholt** | S (~640,610) | **Chapel** with pointed spire + cross | 5 cottages (alternating gold/terracotta roofs), central stone well, paths, 3 trees |
| 5 | **Greymoor** | E (~838,470) | Half-ruined grey **watchtower** (broken merlons, small terracotta pennant) | 4 squat weathered grey-stone cottages, a path, 2 bushes. **Somber moor palette** (cooler, greyer) |
| 6 | **Goldport Harbor** | W coast (~250,560) | **Lighthouse** with a glowing lamp | wooden **quay** over a harbor inlet, 2 moored sailboats, 4 warehouses/houses, paths, greenery |
| 7 | **Tide's End** | W (~300,460) | Slim **round watchtower**, conical terracotta roof + green pennant | 3 small cliff cottages, a clifftop cove pond, path, 3 bushes |
| 8 | **Quiet Fens** | S (~470,660) | 3 **stilt huts** over teal water, linked by plank boardwalks | 2 lily ponds, tall reed clusters, a marsh shrub — a damp green fen |

Plus a 9th named **landmark, not a town:** **Crownspire Peaks** (the mountain range, ~900,320).

**Building vocabulary** (shared across towns): steep-pitched roofs, tiny shuttered windows,
arched doors, the occasional banner/pennant, walls in pale warm stone, roofs alternating terracotta
and straw-gold. Cozy fairy-tale scale, slightly squat and friendly — not gothic or imposing.

---

## 6. Per-region terrain / biomes

The land is not uniform — each area carries its own micro-terrain wash + props:

- **Vale of Embergreen** (NW, ~330,280): **dense forest** — many conifers + round-canopy trees.
- **Goldfield** (N): **rolling gold farmland hills** (gentle ridge lines, wheat tone).
- **Sunmeadow** (NE): **grove + gentle rise** (a few mixed trees).
- **Greymoor** (E): **moorland** — a grey tarn (small lake), rocky crags, scattered purple heather.
- **Larkholt** (S): small **lakes + groves.**
- **Tide's End** (W): **coastal wood** on a cliff.
- **Quiet Fens** (S): **marsh** — ponds, reeds, lily pads.
- **Heartmere** (center): the realm's **central lake.**
- Rivers thread between them, feeding the lakes and the sea.

---

## 7. Living map — ambient animation (HARD RULE: seamless, no teleport)

Every animated element must return to its exact start, or **fade out before any position reset** —
nothing may visibly snap. Loops are slow and gentle; the page should feel *calm*, not busy.

- **Sea serpent (E)** and **whale (SW)** and a **small fish school:** swim → breach/jump → **dive
  under** (fade to 0) → a soft **underwater shadow** glides while submerged → resurface → return to
  exact start. ~15s loop, phases offset between creatures.
- **4 sailboats** in the sea: long slow **sail back-and-forth** (ping-pong) + a tiny **bob/rock.**
- **Wind streaks:** thin pale arcs that **fade in, drift, fade out** (reset happens at opacity 0).
- **Waves:** small lapping tick-marks that gently ping-pong side to side.
- **Birds:** a few static ink "V" gulls near the top (can stay still).
- **Accessibility:** ALL motion must respect *reduce-motion* — when the OS asks for less motion,
  freeze every animation.

---

## 8. Frame, compass & typography

- **Border:** a repeating **rust mountain-ridge pattern** band wrapping all four edges, with a
  thin **gold rectangle rule** just inside it. Reads as a hand-tooled atlas margin.
- **Compass rose** (top-center under title): 8-point star, slim gold rays, a **red north point**,
  concentric gold rings, small center boss. Ornate but not huge.
- **Title cartouche** (top-center): notched cream-and-gold ribbon, bold spaced serif
  **"TERRA QUESTA"**, italic rust subtitle **"An Atlas of Your Realm."**
- **Type:** an old-style serif throughout (think Iowan/Palatino/Georgia). Town names in
  **small-caps**, letter-spaced, inside **swallowtail banners** (cream fill, gold edge, notched ends).
  Minor features in plain serif italic. Sea text faint, widely spaced, italic.

---

## 9. What "BETTER" means here — push these (keep everything above)

Faithful first, then elevate. An AI improving this should aim for:

1. **Richer watercolor:** real pigment granulation, edge-darkening (where a wash dries), and subtle
   color variation within each region — instead of flat blurred blobs.
2. **Truer ink:** confident variable line-weight (thick on shadow sides, hairline on highlights),
   occasional broken/dry-brush strokes, ink pooling at corners.
3. **Atmospheric depth:** warmer/larger detail near the page center, cooler/hazier toward the rim;
   a faint vignette and gentle parchment foxing/staining for age.
4. **Unified lighting:** pick one light direction (e.g. upper-left) and give every building, hill,
   and tree a consistent soft cast shadow — currently shadows are minimal.
5. **More characterful towns:** small storytelling props (market awnings, a windmill's turning
   shadow, smoke wisps from chimneys, tiny figures/carts) without losing readability.
6. **Illuminated-manuscript flourishes:** a decorative corner cartouche, hand-drawn sea-monster
   *marginalia* in ink, a scale bar, knotwork on the frame, a wax-seal motif.
7. **Calligraphic labels:** hand-lettered town names with subtle flourishes rather than set type.
8. **Sea life & texture:** stippled water, foam at the coastlines, gentle directional current lines.

**Do NOT change:** the warm sepia (no black), the cozy gains-only tone, the 8 named towns + their
hero buildings + rough positions, the central capital, Crownspire Peaks, the seamless no-teleport
motion rule, or the parchment-atlas identity. Those are canon.

---

## 10. One-paragraph prompt (if you only get a text box)

> A hand-drawn antique fantasy world atlas titled "Terra Questa — An Atlas of Your Realm." Aged
> parchment in warm cream-to-tan, a single irregular continent with hand-inked coastline and four
> small offshore islands, painted in soft watercolor washes (spring greens, gold farmland, muted
> purple moor, teal marsh) under fine sepia-brown pen linework — no pure black. Eight little
> illustrated medieval towns dot the land, each a cozy cluster of steep-roofed cottages in
> terracotta and straw-gold around a hero building (a walled twin-tower capital citadel with a
> cathedral at center; a windmill; a castle keep; a chapel with a spire; a coastal lighthouse and
> quay; a clifftop round tower; a charming half-ruined grey watchtower on a heather moor; three
> stilt huts over a fen) — linked by dotted dirt paths, with trees, ponds, rivers, a central lake,
> and a hatched snow-capped mountain range. An ornate compass rose and notched ribbon banners label
> each town in small-caps serif. A rust mountain-ridge border and inner gold rule frame the page.
> Warm, storybook, inviting; subtle living motion (sailing boats, diving sea creatures with
> underwater shadows, drifting wind, lapping waves). Vector cartography, crisp, readable at small
> size. Cozy and gains-only — never dark or grim.
