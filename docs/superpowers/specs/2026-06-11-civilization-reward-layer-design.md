# QuestDay — "Your Realm": Civilization Reward Layer (Design Spec)

- **Date:** 2026-06-11
- **Status:** Direction approved through brainstorming; pending spec + guardrails sign-off, then feature-by-feature build.
- **Targets:** next minor release (working label v1.10).
- **Replaces:** the current Realm reward layer's *prominence* (the Realm map + Chronicle are **reused**, not deleted).

---

## 1. Vision (one paragraph)

Replace the Realm reward layer with an **explorable, ever-growing medieval-fantasy civilization**. Completing real quests visibly **builds a town**; over time the town climbs **Camp → Settlement → Village → Town → City → Kingdom → Empire**, and the world expands to **multiple towns** the user can travel between. The world is the emotional reward; numbers (XP/level) are demoted. It is **gains-only, never punishing**, **lightly interactive** (buildings auto-appear on completion; optional drag-to-rearrange), and the meta-game must **never overshadow actually doing tasks**.

---

## 2. Locked decisions (from brainstorming)

- **Scope:** MVP that replaces the Realm; big ideas parked for later.
- **The old map:** the Realm/Terra Questa expedition + knowledge-fact Chronicle is **kept** and folded in — it becomes the **zoomed-out world map** (the navigation backbone), reached via a **Cartographer's Tower** building.
- **Categories:** uniform growth now (driven by total completions + difficulty); per-category personalization is a later idea.
- **Interactivity:** **auto-appears, then optional rearrange** (builder-lite). Tasks stay the point.
- **Navigation:** **three-level discrete zoom** — World map ↔ a Town ↔ click a building to open its feature. Click-to-enter with a short cross-fade; **not** continuous zoom.
- **Pacing:** steady/earned — Empire takes ~a few months of regular use.
- **Aliveness:** ambient life now (smoke, day/night, banners, "building rises"); **named townsfolk/settlers are later**.
- **Celebration:** **bold** — building rises + a banner + the widget reacts. (Answers "the garden felt too relaxed.")
- **Numbers:** **lead with the world, soften the numbers** (town stage = headline; streak shown as the Bonfire; XP/level demoted to a small crest / Hall of Records).
- **Launch towns:** **Greenhaven Heartland** (green medieval) + **Goldport Harbor** (coastal). Locked "coming soon" lands: **Frostpeak** (snow) + **Sun Reach** (desert).
- **Art:** **free CC0 only** for launch — **Kenney Isometric Miniature** (hero buildings) + **Screaming Brain Studios** (terrain/volume), recolored to brand and unified by a canvas "premium grade." Optional ~$10 hand-drawn upgrade is a later fast-follow.
- **World map art:** richer — regenerate geography in **Azgaar** (MIT, commercial-safe), restyle to a parchment fantasy map with CC0 ink icons + gold-leaf frame.

---

## 3. Tone & integrity (non-negotiable)

1. **Gains-only, never punishing.** The civilization only ever grows. A missed day = a cozy **"resting"** state (lanterns dim, villagers sleep), never decay/reset/loss. The **Bonfire never goes out**.
2. **The reward never overshadows tasks.** The full reward (building appears, celebration, XP/streak) fires on quest completion and is fully legible from the **default centered view**. Pan / zoom / travel / decorate are **optional pleasure**, never a gate on any reward. The whole feature sits behind the existing `enabledFeatures` toggle (data never deleted, only the tab hidden).
3. **↩ Restore stays exact.** Any civilization growth a completion causes must reverse exactly on Restore. Unlocks are a **pure function of all-time completions** (derived, not stored), mirroring the current realm engine, so Restore's claw-back math stays intact.
4. **Do not delete** the inert garden engine, `realm.ts`, `chronicle.ts`, or the Realm rendering — they are **reused**.
5. **Art is commercial-safe CC0 only** for launch; maintain a license/credits manifest; never add an art-export feature; avoid NonCommercial / ShareAlike / CraftPix / Inkarnate traps.
6. **Local JSON only**, no accounts/cloud. Phosphor icons = UI chrome only (never inside the canvas scene). Tunables → `balance.ts`; design tokens → `theme.css`.

---

## 4. Architecture

### 4.1 Three-level navigation
- **Level 0 — World map:** the Terra Questa parchment map. Each region is a place: **fogged/locked → discovered → settled**. Settled regions are enterable; locked ones show a misted "coming soon" silhouette + a "X more quests" pull.
- **Level 1 — Town:** an isometric `<canvas>` scene for the active settlement.
- **Level 2 — Feature:** clicking a building opens an **existing app feature** (Cartographer's Tower → Realm map + Chronicle; Tavern → Arcade; Forge → Focus; War Room → Eisenhower).
- Transitions are **discrete** (click to enter) with an optional ~300 ms CSS scale + cross-fade. No continuous-zoom engine.

### 4.2 Renderer (towns)
- **HTML5 `<canvas>`**, true 2:1 isometric, **render-on-change** (not a 60 fps loop). Single camera object `{x, y, scale}` fed to `ctx.setTransform`. Drag-to-pan (raw screen-pixel delta), wheel zoom-to-cursor (clamped), hit-testing via `getTransform().invertSelf()`, viewport culling (draw only visible tiles + padding, depth-sorted by `x+y`), **devicePixelRatio-aware** (applied once; not double-applied). **Vanilla — zero new npm deps**; no game engine (no `@pixi/react`, incompatible with React 18). A short rAF runs only during pan-momentum, zoom tweens, and the capped (~30 fps) ambient-life loop, then stops.
- The **world map (Level 0)** stays an **SVG** (cheap, already clickable per-region); only the town level uses canvas.

### 4.3 Data model
- The world is a **LIST of settlements**, even though we ship the list with relevant entries. Each settlement: `id`, `biome`/`atlasKey`, `worldRegionId` (which Terra Questa region it sits in), and a `buildings` layout.
- **Static content** (which towns exist, unlock thresholds, default building layouts, what unlocks at which completion count, biome art keys) lives in `balance.ts` / `defaults.ts`.
- **Persisted, user-specific deltas only:** optional drag-rearrange overrides, last-visited settlement — plus the existing `settings.realmChronicle`. Nothing per-region "unlocked" boolean is stored.
- **Unlocks are derived** from all-time completions (pure function). New towns/biomes later = **pure data appends**, never a schema migration.
- **Save discipline:** civilization state added as its own top-level key (replaced wholesale on save) OR as derived/static; do **not** route large mutable objects through the `settings`/`player` deep-merge unless they are small changed-field writes. Persist to disk before advancing the in-memory cache (existing rule).

### 4.4 Quest-completion hook
At the point where a completion currently grants a realm expedition (`store.ts` completion flow), additionally:
1. Grow the **active town**: add or raise **one** structure, **weighted by difficulty** (Easy = small piece: path/fence/tree; Medium = cottage/decor; Hard = a landmark or a feature-building). Building choice is deterministic (seeded by completion index), so it is reproducible and reversible.
2. Feed the **Bonfire** (streak).
3. Fire the **bold celebration** (building rises + banner + widget reaction).
4. Store the **exact award** for Restore.
5. The inert **garden engine still runs** untouched.

### 4.5 The "premium grade" (the look)
Base sprites are CC0; **premium comes from the grade**, applied in canvas over the sprites (ordered):
1. Recolor each sprite to a tight per-biome **emerald/gold** palette (cached once).
2. **Uniform soft drop-shadow** under every building (strip baked-in shadows; apply one consistent shadow).
3. **Fake ambient occlusion** ring under footprints.
4. **Kill empty ground:** multi-tone ground tiles + winding **paths** + seeded **prop/foliage scatter**.
5. **Unify packs:** consistent 1px outline + tint pass so two sources read as one set.
6. **Global split-tone wash:** `multiply` emerald (~0.10α) + `screen` gold (~0.08α) over the composited scene.
7. **Depth/backdrop:** sky gradient + distant hills + horizon fog band (parallax).
8. **Ambient life** (capped ~30 fps, paused off-screen): chimney smoke, water shimmer, swaying banners, drifting clouds.
9. **Gentle gold bloom** on lights/trim.
10. **Day/night tint by real clock** + lit windows at night.
11. **Vignette + paper grain** finish (mirrored on the world map for cohesion).
12. **Transition + active-building rim-light** polish.

### 4.6 World map art
Regenerate Terra Questa geography in **Azgaar** (MIT; exported maps are commercial-safe to bundle, no attribution), re-place the 16 regions' labels/landmarks, and style as **parchment**: paper texture, sepia/gold hand-drawn ink landmark icons (CC0, e.g. comigo pack), region names in the brand display font, a compass rose, and a gold-leaf inner frame over an emerald mat. Undiscovered regions render as faint pencil/fog (gains-only "charting"). Native SVG filters (`feTurbulence` / `feDisplacementMap` / `feDropShadow`) — no new deps.

---

## 5. The buildings

### 5.1 Growth ladder (decorative, auto-spawn by stage)
- **Camp:** campfire (→ becomes the Bonfire), tent, bedrolls, crates, dirt path.
- **Settlement:** more tents, palisade, well, first cottage, veggie patch.
- **Village:** stone cottages, market stalls, bakery, chapel, cobbled roads, windmill, pond.
- **Town:** Town Hall, inn, stone bridge, guard tower, fountain.
- **City:** walls + gatehouse, cathedral, grand plaza, districts, clocktower, harbor.
- **Kingdom:** Castle Keep, banners, barracks, royal garden, paved avenues.
- **Empire:** a World Wonder landmark, multiple districts, arches, statues.

### 5.2 Feature-buildings (each one IS an app feature) — **MVP cut**
- **Cartographer's Tower** → the world map + Chronicle facts (the "zoom out" door).
- **The Bonfire / Great Hearth** → the **streak**, visualized; rests on a missed day, relights + welcome-home on return.
- **The Tavern / Game Hall** → the **Arcade**.
- **The Forge / Workshop** → the **Focus** timer.
- **The War Room / Council Table** → the **Eisenhower** matrix.

### 5.3 Later feature-buildings
Hall of Records (stats/milestones as monuments) · Quest Board (quests in-world) · Watchtower/Beacon (current quest) · Greenhouse/Royal Garden (nods to the kept garden) · Mill/Farm (recurring quests) · Bell Tower/Sundial (time frames).

### 5.4 Goldport Harbor feature mapping (town #2)
Lighthouse → Focus/Active mode · Harbor Master → Time-blocking · Market Docks → Arcade/economy · Shipwright → a future feature. (Gives roughly 2× the slots for current + future features.)

---

## 6. Streak, celebration, numbers

- **Bonfire = streak.** Grows taller/brighter with the streak; missed day → cozy "resting" dusk (nothing lost) + a silent "rest token"; return → relight + a one-time welcome-home decoration. Never resets or decays.
- **Bold celebration.** New building **rises** with a short animation; a gold banner ("Your village grew!"); a **stage-up** crossing fires a bigger celebration + a stage-exclusive landmark; the always-on widget reacts.
- **Numbers softened.** Town **stage** is the headline; **streak** = the Bonfire; **XP/level** demoted to a small crest (and detailed inside a later Hall of Records). Completion celebration centers on the building, not "+XP." Numbers remain one tap away.

---

## 7. Pacing (all tunable in `balance.ts`)

- **Stage thresholds (completions):** Camp 1 · Settlement ~5 · Village ~15 · Town ~40 · City ~100 · Kingdom ~250 · Empire ~600 (retune against real usage).
- **Town #2 (Goldport) unlocks** at roughly the **Village** milestone (~15 completions) — late enough that town #1 isn't empty, early enough to feel the "travel" payoff. Locked lands (Frostpeak/Sun Reach) show on the world map with a "X more quests" meter.
- **Building scale by difficulty:** Easy = small piece · Medium = cottage · Hard = landmark/feature-building.

---

## 8. MVP scope vs. later

**MVP (this build):**
- Canvas isometric town renderer + camera (pan/zoom) + the premium grade, **Greenhaven** with **real CC0 art**.
- Stage ladder Camp→Empire + bold celebration + stage-up + the **Bonfire** streak (rest/return).
- Quest-completion → grows the active town (difficulty-weighted), exact ↩ Restore.
- World-map level (parchment Terra Questa) + discrete zoom navigation + **Goldport** as town #2 + locked Frostpeak/Sun Reach.
- Feature-buildings click-through: **Cartographer's Tower, Tavern, Forge, War Room** (+ Bonfire).
- Optional drag-rearrange; numbers-softened UI; license/credits manifest.

**Later backlog (parked):** named townsfolk/settlers · pets · Explorer's Guild (expeditions) · Museum · seasonal festivals · non-destructive Empire **ascension** to new biomes · castle interiors · world wonders · category-driven personalization + guilds · remaining feature-buildings (Hall of Records, Quest Board, Greenhouse, Mill, Bell Tower) · paid hand-drawn hero-art upgrade · richer continuous transitions.

---

## 9. Acceptance criteria ("done" definitions)

- **Renderer/town:** Greenhaven renders with real CC0 sprites + the grade; pan (drag) and zoom (wheel) work, crisp on a HiDPI Windows display; no blur/shimmer; runs render-on-change (no idle CPU spin). **User confirms it looks good in the real app.**
- **Completion growth:** completing a quest adds **exactly one** building (scaled by difficulty) with the rise animation + celebration; **↩ Restore removes exactly that building** and reverses XP/streak exactly; the garden engine and chronicle math are unaffected.
- **Stages:** crossing a threshold advances the stage once, fires the stage-up celebration, and reveals the stage landmark; never regresses.
- **Streak/Bonfire:** Bonfire reflects the streak; a missed day shows the resting state with **no loss**; return relights + grants the welcome-home decoration.
- **Navigation:** zoom-out shows the parchment world map with Greenhaven settled + locked lands; clicking a settled region enters its town; clicking a feature-building opens that real feature; back/Esc returns.
- **Two towns:** Goldport unlocks at its threshold and is travelable; both look distinct.
- **Tone/safety:** the whole feature hides via the toggle with no data loss; all bundled art traces to a CC0 license recorded in the manifest; `npm run typecheck` clean; the relevant `pw:` driver passes against the built `out/`.

A task is **not done** if any part is partial — partial work is reported explicitly.

---

## 10. Build order (feature queue — one at a time, each gated by your OK + test steps)

1. **Scaffold:** settlement data model (`types.ts`/`defaults.ts`/`balance.ts`), reframe the Realm tab as "Your Realm," feature-toggle wiring, placeholder render. *(No visual art yet.)*
2. **Town renderer + camera:** canvas isometric Greenhaven with **real CC0 art** + the premium grade, static layout, pan/zoom. **← the "see real art" moment.**
3. **Completion → growth:** difficulty-weighted auto-spawn + building-rises animation + bold celebration + exact ↩ Restore.
4. **Stage ladder + Bonfire streak** (rest/return) + stage-up celebration + numbers-softened header.
5. **World-map level** (Azgaar parchment Terra Questa) + discrete zoom navigation + locked "coming soon" lands.
6. **Town #2 (Goldport Harbor)** as data + travel between towns.
7. **Feature-buildings click-through** (Tower→Realm/Chronicle, Tavern→Arcade, Forge→Focus, War Room→Eisenhower).
8. **Optional rearrange + ambient-life polish + transitions.**
9. **License/credits manifest + `pw` driver + dist verification.**

---

## 11. Guardrails to add to CLAUDE.md (for sign-off)

**Integrity line (this feature):** gains-only/never-punish (extends the existing tone rule); reward never overshadows tasks (full reward from default view; exploring optional; behind the feature toggle); ↩ Restore stays exact (unlocks derived, award stored); do not delete the garden engine / realm.ts / chronicle; CC0-only art with a license manifest, no art-export feature; local JSON only.

**Irreversible / stop-and-confirm actions (this stack):** changing the `db.json` schema or the save deep-merge/validate logic; deleting/renaming existing engines or views; adding/removing npm dependencies; touching preload/IPC/sandbox/window-security; running `npm run dist` / building or publishing an installer; `git push` / force-push / branch deletion; any write to the **real** `db.json` (pw drivers use an isolated `--user-data-dir`).

**Definition of done:** `npm run typecheck` clean (main + renderer) **and** the relevant `pw:` driver passes against the built `out/` **and** the spec's acceptance check for that task is met; visual/art tasks also require the user to have seen it in the real app and accepted the look. Partial builds are flagged explicitly, never reported as done.
