# Town Editing v1 — "Arrange Your Town" (design spec)

**Date:** 2026-06-16
**Status:** Approved design, pre-implementation
**Branch context:** `feature/civilization-world-map`
**Parent feature:** Civilization reward layer (`docs/superpowers/specs/2026-06-11-civilization-reward-layer-design.md`).
This spec details the spec's already-anticipated *"auto-appears, then optional rearrange (builder-lite)"* interaction (parent §2, §4.3, §8).

Inspiration: **Goodgame Empire** — its core single-player loop is "a map of settlements → enter one → build/arrange it." We borrow the *arrange-your-settlement skeleton* and deliberately drop GGE's punishing/PvP/monetization engine (research: 2026-06-16 multi-agent study). This is the user-chosen headline of the civilization layer: *hands-on editing is the point.*

---

## 1. Summary & goal

Let the user enter any unlocked town and **personally arrange it** — drag buildings to new spots on the town's grid, and swap a building's type — in a dedicated **Edit mode**, with grid-snap placement and a one-tap **Reset to auto-layout** safety. Each town remembers its own arrangement.

**Why:** the civilization reward layer's headline experience, chosen by the user, is hands-on editing. This delivers the "go inside and edit it" feeling that makes empire games satisfying, while preserving every QuestDay integrity rule.

**What it is NOT:** a resource/management game. Buildings still **appear automatically on quest completion**; editing is a purely optional layer of self-expression on top. Tasks stay the point.

---

## 2. What exists today (build on, don't rebuild)

Verified by read-only investigation of the current codebase:

- **`src/renderer/app/TownView.tsx`** — renders a town on a **deterministic 7×7 isometric grid** (`PLOTS`, sorted center-out by Chebyshev ring → distance → angle; origin `[0,0]` = town center = the Hall). Tunables: `TILE_W=100`, `TILE_H=50`, `BUILDING_SCALE=0.72`, `JITTER_X=16/JITTER_Y=9`, `OX=380/OY=210`. Building count per stage is the pure array `COUNT_BY_STAGE = [2,4,7,11,16,22,30]` (Camp→Empire). Per-plot building **kind** is chosen deterministically by `kindFor()`/`KIND_CYCLE` (plot 0 always `hall`). Jitter/scale/weathering are deterministic via a seeded `hash(gx,gy)` — **no `Math.random()`**, so the town is fully reproducible. Empty tiles get scattered biome decorations via `decorationsFor()`.
- **`src/renderer/app/townBuildings.ts`** — auto-generated (from `_buildings.json` via `scripts/_gen-town-buildings.mjs`); 5 building kinds as inked SVG strings: `hall`, `keep`, `tavern`, `house`, `cottage`. Rendered via `dangerouslySetInnerHTML`.
- **`src/renderer/app/biomeDecor.ts`** — 8 biomes (`meadow|forest|moor|marsh|coast|mountains|desert|tundra`) of ground colors + decoration SVGs; `REGION_BIOME`/town-biome mapping drives which set a town uses.
- **`src/shared/engine/civilization.ts`** — `worldStage`, `civProgress`, `townStates`, `civSummary`: **all pure functions of all-time completion count.** **Nothing about the civilization is stored today** — the quest list is the single source of truth.
- **`src/shared/config/balance.ts`** — `balance.civilization.stages` (Camp 0 / Settlement 5 / Village 15 / Town 40 / City 100 / Kingdom 250 / Empire 600) and `balance.civilization.towns` (unlock thresholds + per-town biome).
- **`src/main/db/store.ts`** — `saveDatabase` **deep-merges** `settings`/`player` and **replaces all other top-level keys wholesale**; validates before persisting; writes to disk (atomic temp+rename+fsync) **before** advancing the in-memory cache.
- **`src/shared/types.ts`** `Database` keys today: `version, quests, timeFrames, player, garden, arcade, settings, lastSeenDate` — **no civilization/layout key.**
- **`src/renderer/app/features.ts`** — `enabledFeatures['world']` gates the Realm tab (data never deleted, tab only hidden).
- **No drag/drop/placement/override code exists anywhere.** This is greenfield interaction.

---

## 3. Integrity line (how this feature stays inside the rules)

This feature extends — never weakens — the tone/integrity rules. Each is a hard constraint:

1. **Gains-only, never punishing.** Editing only ever adds/moves/re-skins. Nothing is destroyed; **Reset** returns to the automatic layout (it does not "lose" anything, because the automatic layout is always re-derivable). No decay, no fail state.
2. **Reward never overshadows the task.** Buildings still appear automatically on completion from the default view; **Edit mode is entirely optional** and grants **zero** progression advantage. A user who never opens it gets the full reward.
3. **↩ Restore stays mathematically exact.** Unlocks/stage/building-count remain a **pure function of completions** (`civilization.ts` is untouched). Layout edits live in a **separate, sealed data layer that the completion/reward math never reads.** Reversing an accidental completion can never be corrupted by edits, and editing can never corrupt a Restore. (See §7.)
4. **Zero new dependencies.** Implemented with pointer events + SVG transforms + JSON only.
5. **Bundle-safe art only.** No new art required for v1 (reuses the 5 existing inked-SVG kinds). Any future art remains self-authored / CC0.

---

## 4. v1 scope

### In scope
- **Rearrange:** drag a building to a different grid cell (grid-snap, empty cells only).
- **Swap type:** tap a building → pick a new type from the 4 non-Hall kinds (`keep`, `tavern`, `house`, `cottage`).
- **Dedicated Edit mode:** a toggle; normal viewing is unchanged when off.
- **All unlocked towns** are independently editable (each remembers its own arrangement).
- **Reset to auto-layout** per town.
- Edits **persist** across app restarts.

### Explicitly OUT of v1 (the boundary)
- ❌ **Decorate with props** (trees/fountains/banners/paths/lanterns) → **v2**.
- ❌ **Shape the land / terraforming** (ground tiles, paths, terrain) → **v3 or later**.
- ❌ **Unlocking building types by progress** (all 4 swappable kinds available from the start).
- ❌ **Moving the central Hall** (it is the fixed landmark/anchor).
- ❌ **Expanding/resizing the grid or land by hand** (land still grows automatically by stage).
- ❌ **Any change to pan / zoom / navigation** (discrete enter-exit a town stays exactly as-is; parent spec §4.1).
- ❌ Multi-select, copy/paste layouts, rotate buildings, free (non-grid) placement.

---

## 5. The experience (user flow)

1. User is viewing a town (after entering it from the world map). A small **Edit** button sits in a corner of the town view.
2. Tap **Edit** → the grid gently appears (faint isometric tile outlines); buildings gain a subtle "grab me" affordance. A small toolbar shows **Reset to auto-layout** and **Done**.
3. **Drag a building** → it follows the pointer and **snaps to the nearest grid cell**. Cells that are invalid drop targets (occupied, the Hall's center cell, or off-grid) show a clear "can't drop here" state; valid empty cells highlight. Releasing on a valid cell commits the move.
4. **Tap a building** (tap without dragging) → a small **type picker** appears (the 4 kinds) → choosing one re-skins that building in place.
5. **Reset to auto-layout** → clears this town's edits and returns it to the automatic arrangement (with a gentle confirm, since it discards manual arrangement — but it is non-destructive: nothing of value is lost).
6. **Done** → exits Edit mode; arrangement is saved. Normal viewing resumes.

The Hall is visibly the fixed heart: in Edit mode it shows as non-draggable (no grab affordance).

---

## 6. Architecture & data model

### 6.1 Approach: derived base + sparse overrides (chosen)
The town's automatic layout remains the **base** (pure function of completions). We persist **only the deltas the user creates** — a small per-building override. At render time: compute the automatic layout, then apply overrides on top. (The rejected alternative — snapshotting the whole layout on first edit — was declined because it decouples the town from completions and threatens Restore-exactness.)

### 6.2 Building identity
Each building in the deterministic layout has a **stable index** `i` = its position (0-based) in the center-out fill order. By default building `i` occupies cell `PLOTS[i]` with kind `kindFor(i)` (where `i === 0` ⇒ `hall`). This index is **stable as the town grows**: increasing the completion count only appends higher indices; existing buildings keep their index. Index `0` (the Hall) is **fixed and non-overridable**.

### 6.3 Persisted shape (NEW — schema change, see §11)
A **new top-level `Database` key** (wholesale-replace on save, so a Reset is simply "send the object without this town"):

```ts
// src/shared/types.ts
type SwappableKind = 'keep' | 'tavern' | 'house' | 'cottage' // NOT 'hall'

interface PlotOverride {
  cell?: number   // PLOTS index (0..48) this building was moved to; omitted = default cell
  kind?: SwappableKind // chosen type; omitted = deterministic kindFor(i)
}

interface TownLayout {
  // sparse: only buildings the user touched. Keyed by building index i (as string in JSON).
  overrides: Record<number, PlotOverride>
}

// Database gets one new key:
//   townLayouts: Record<string /* townId */, TownLayout>
```

- **Default:** `townLayouts: {}` (added to `createDefaultDatabase` in `src/shared/defaults.ts`).
- **Migration:** the tolerant merge in `store.ts` treats a missing `townLayouts` as `{}` (older save files load unchanged).
- **Validation:** `validate()` accepts `townLayouts` only as an object whose values are `{ overrides: object }`; reject otherwise (fail safe to the automatic layout).
- **Save path:** `townLayouts` is a **replace-wholesale** key (NOT under `settings`/`player`, which deep-merge). The renderer holds the full `townLayouts` map in its store and writes the whole map on each edit. Reset = write the map with that town's entry removed. This makes "clear a town's edits" trivial (deep-merge would not be able to delete keys cleanly).

### 6.4 Render resolution (deterministic, given completions + overrides)
In `TownView` (pseudocode, altitude-only — implementation reads the real `PLOTS`/`kindFor`):

```
stageIndex = worldStage(completions).index
N          = COUNT_BY_STAGE[stageIndex]
ov         = townLayouts[townId]?.overrides ?? {}

// 1. Overridden buildings claim their target cell first.
claimed = new Map()              // cell (PLOTS index) -> building index
claimed.set(0, 0)                // Hall always claims cell 0 (PLOTS[0] = center [0,0])
for i in 1..N-1 where ov[i]?.cell != null:
    claimed.set(ov[i].cell, i)

// 2. Each non-overridden building keeps its OWN default cell PLOTS[i] if still free;
//    it reflows to the next free center-out cell ONLY if an override claimed that exact
//    cell. (So untouched buildings never shift when you move a different building, and
//    new buildings from later completions flow around whatever you've placed.)
for i in 1..N-1 where ov[i]?.cell == null:
    cell = (claimed has PLOTS_index(i)) ? nextFreeCenterOut(claimed) : PLOTS_index(i)
    claimed.set(cell, i)

// 3. Resolve kind + position and render.
for (cell, i) in claimed:
    kind = (i === 0) ? 'hall' : (ov[i]?.kind ?? kindFor(i))
    render building `kind` at iso(PLOTS[cell]) with existing jitter/scale/weathering(seed by cell)

// 4. Cells with no building -> biome decorations, exactly as today.
```

Notes:
- **Defensive collision resolution:** if two overrides somehow claim the same cell (shouldn't happen — moves target empty cells), the **lower index wins** and the higher is reflowed via `nextFree`.
- **Jitter/weathering** continue to seed off the **cell** (grid coords), so a building's organic look stays tied to where it sits, and the town stays fully reproducible.

---

## 7. ↩ Restore exactness (the critical guarantee)

- `townLayouts` is **never read by** `civilization.ts`, the rewards engine, or the streak/XP math. Stage, building count, and town unlocks remain a pure function of completions.
- **Restoring an accidental completion** lowers the completion count → `N` may shrink. Buildings with index `≥ N` simply **aren't rendered**; their overrides **remain stored but inert**, and reappear unchanged if the count rises again. Coins/XP/streak claw-back is computed exactly as before — edits are invisible to it.
- **Editing** writes only to `townLayouts` and changes **no** completion-derived value. Therefore edit ⟂ Restore in both directions.
- This preserves the parent spec's rule: *civilization unlocks are a pure function of all-time completions (DERIVED, not stored); each completion stores its exact award.*

---

## 8. UI / interaction details

- **Edit toggle:** local React state in `TownView` (`isEditing`); no persistence (always starts off when entering a town).
- **Grid overlay:** render the `PLOTS` cells as faint iso diamonds while editing (reuse the existing iso math). Empty cells (valid drop targets) highlight on drag-over.
- **Dragging:** use **pointer events** (`onPointerDown/Move/Up`) on each building `<g>` — works for SVG and needs no library. Track the dragged index; on move, translate the building's transform to follow the pointer; on up, compute the nearest cell via the inverse iso transform and snap.
- **Hit-testing:** discrete SVG `<g>` per building; a small invisible hit-rect per building keeps taps reliable. Tap vs. drag distinguished by a movement threshold (e.g. < 6px = tap → open type picker; else = drag).
- **Type picker:** a small popover near the tapped building with the 4 kind icons; selecting writes `ov[i].kind`. The Hall shows no picker.
- **Invalid drop feedback:** occupied cell, Hall's center cell, or off-grid → building springs back to its prior cell with a clear "no" cue; no override written.
- **Reset to auto-layout:** gentle confirm ("Return Greenhaven to its natural layout? Your arrangement will be cleared."), then removes the town's entry from `townLayouts` and saves.
- **Tone of copy:** never punishing/quota framing anywhere (e.g. no "you haven't arranged this yet"). Edit mode is invitation, not obligation.
- **Reduced motion:** honor `prefers-reduced-motion` for any drag/snap/spring animation (note: Playwright can't observe OS reduce-motion — verify via `emulateMedia`).

---

## 9. Edge cases & rules

- **Hall fixed:** index 0 never moves, never re-skins, never accepts a drop on its cell.
- **New buildings after editing:** future completions add higher indices that fill the nearest open cells (step 2 above) — **they never displace** a building the user placed.
- **Count shrink (Restore / lower stage):** higher-index buildings vanish; their overrides persist inert (§7).
- **Freed cells:** a moved building's old cell becomes empty → gets biome scenery automatically (no extra logic).
- **Swap only, no move (or vice versa):** overrides are independent fields; a building may have `kind` only, `cell` only, or both.
- **Town not yet unlocked:** not enterable, so not editable; its (absent) layout is `{}`.
- **Feature toggle off:** if `enabledFeatures['world']` is off, the Realm/town UI is hidden; `townLayouts` data is retained untouched (tone rule — never delete).

---

## 10. Zero-deps & performance

- **Zero new npm dependencies** (pointer events + SVG + JSON only). This is a hard target and a stop-and-confirm if ever challenged.
- **Performance watch (from review):** at Empire stage a town draws up to 30 buildings (the Hall alone ~130 SVG nodes) plus scattered biome decorations, via `dangerouslySetInnerHTML` and CSS animation. Edit mode adds a grid overlay + per-building hit-rects + a live-dragging transform. Verify drag stays smooth in Electron/Chromium at the largest stage before considering done; if needed, suppress ambient CSS animations while `isEditing`.

---

## 11. Stop-and-confirm actions (explicit yes required at build time, per CLAUDE.md)

These are flagged here in the design but require a **separate explicit go-ahead for the specific action** when implementation reaches them:
1. **Adding the `townLayouts` top-level key to the `Database` schema** + its default + migration tolerance + `validate()` rule + save-path classification. (Schema change.)
2. Any change to **save deep-merge/validate logic** in `store.ts` (only the additive `townLayouts` handling; no change to existing keys' behavior).
3. Building/running the installer, any `git push`/force-push, or any write to the **real** `db.json` (Playwright drivers must use an isolated `--user-data-dir`).

No preload/IPC/sandbox/window-security changes are anticipated (the existing `store.saveState` IPC carries the new key like any other top-level key).

---

## 12. Verification / definition of done

**Done = all of:**
1. `npm run typecheck` clean (main + renderer).
2. A new Playwright driver (e.g. `pw:townedit`, isolated `--user-data-dir`, against built `out/`) passes, covering:
   - Seed completions to a multi-building stage → enter a town → toggle Edit → **drag** a building to an empty cell → **swap** another building's type → **Done**.
   - The override is written to the isolated `db.json` under `townLayouts[townId].overrides`.
   - **Reload/restart** → arrangement persists.
   - **Complete another quest** → a new building appears in an open cell and the placed/swapped buildings are **unchanged**.
   - **↩ Restore** a completion → stage/count/coins/XP revert exactly **and** the layout is untouched.
   - **Reset to auto-layout** → town returns to the deterministic arrangement; `townLayouts[townId]` removed.
3. The user has **seen Edit mode in the real app** (and first in a `mockups/` prototype) and accepted the look/feel (visual/art acceptance per CLAUDE.md).
4. Tone check: no punishing/quota copy; Reset is non-destructive; reward still fires automatically with Edit mode never opened.

Partial work is reported as partial — never reported done with any acceptance item unmet.

---

## 13. Build sequence (one feature at a time)

Each step: plan → user OK → build → test steps → user confirms → next. Proposed order:
1. **Interactive mockup** in `mockups/` (offline HTML/SVG) of Edit mode — drag + snap + type picker + grid overlay — for visual approval before any real code.
2. **Data layer** (stop-and-confirm): add `townLayouts` to types/defaults/migration/validate/save classification; no UI yet. Verify save/load round-trips in an isolated driver.
3. **Render overrides:** make `TownView` apply `townLayouts` (read-only) so a hand-seeded override renders correctly (move + swap), including new-building fill and biome on freed cells.
4. **Edit mode UI — swap:** toggle + tap-to-open type picker writing `kind` overrides (simpler than drag; ships value first).
5. **Edit mode UI — drag/move:** pointer-event drag + grid-snap + invalid-drop feedback writing `cell` overrides.
6. **Reset to auto-layout** + tone/copy pass + reduced-motion + performance check at Empire stage.
7. **`pw:townedit` driver** covering §12, then typecheck, then user acceptance in the real app.

---

## 14. Roadmap (locked destination beyond v1)

- **v2 — Decorate with extras:** placeable cosmetic props (trees, fountains, banners, lanterns, paths). New: prop art (self-authored/CC0), an unlock list (derived from completion thresholds), and a separate cosmetic placement layer (same "sealed from completion math" discipline as `townLayouts`). Purely cosmetic — never a stat or gate.
- **v3 (or later) — Shape the land:** terraforming ground tiles/paths/terrain. Heaviest; new art + a distinct storage model. Evaluate after v1/v2 land.

---

## 15. Resolved decisions (for the record)

- Headline of the civilization layer = **hands-on editing** (user choice, over "auto-grow" / "lightweight").
- v1 = **Arrange (move + swap)**; decorate and terraform deferred.
- Editing across **all unlocked towns**.
- **Dedicated Edit mode**, **grid-snap** placement.
- **Hall fixed**; **swap palette = 4 non-Hall kinds**, no unlock gating in v1.
- **Override-layer** persistence (not snapshot), to protect Restore-exactness.

## 16. Open questions (none blocking; confirm during build)

- **Stage/unlock pacing** (Camp→Empire thresholds) is inherited from the parent spec; not changed here. Revisit if week-one growth feels flat.
- **Type-picker affordance** (popover vs. side panel) — settle visually in the mockup step.
- Whether **Reset** should be per-town only (assumed) or also offer a global "reset all towns" (deferred unless asked).
