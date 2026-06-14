# Feature 3 — Parchment World Map (build spec)

_The precise plan for coding the real Terra Questa world map once the look is approved. Approved look = `mockups/world-map-storybook.html` (storybook warm-parchment). This is the originally-paused map-rebuild step. **No code until the user OKs this feature** (per CLAUDE.md gate)._

## Goal
Render Terra Questa (Level 0 of the 3-level civilization nav) as an interactive, on-brand parchment map in the app — faithful to `mockups/world-map-storybook.html`, driven by real `realm.ts` state. Clicking a settled region/settlement enters its town (Level 1, future feature). Gains-only: charted regions stay charted forever; nothing decays.

## Architecture (what to build, what to reuse)
- **New file `src/renderer/app/civilization/WorldMap.tsx`** — a React component rendering inline **SVG** (zero-dep; no canvas needed at this zoom; no new npm dependency).
- **New file `src/shared/config/worldMapLayout.ts`** — static authored layout (positions/icons/tier per region), because `realm.ts` is pure-logical and holds **no coordinates**. This mirrors the mockup's hand-placed positions. Tunable numbers go here per the balance.ts convention (or a sibling layout const).
- **Reuse `realm.ts`** (DO NOT delete/rename — irreversible gate): bind logical state to visuals. Reuse `chronicle.ts`. Terra Questa region names already live in `balance.realm.atlases[].regions[]`.
- **Icons**: bundle the 12 storybook map icons (from the mockup, `<symbol>` set) as a static SVG sprite the component references. These are stand-ins for v1 (free route) — swap for final art later.
- **Toggle**: gate the whole map view behind one `enabledFeatures` key + one `features.ts` entry (the sanctioned pattern; data never deleted).

## Data binding (realm.ts → visual state)
| Visual state (from mockup) | Driven by |
|---|---|
| **Charted** (full ink + gold underglow) | region id ∈ `chartedRegionIds(chronicle)` |
| **Uncharted** (faded + dashed + mist) | region exists in `balance.realm.atlases[].regions` but not charted |
| **Settlement** (gold ring + building icon) | `worldMapLayout` flags `settlement: true` (Greenhaven Heartland = home, Goldport Harbor) |
| **Coming soon** (silhouette + badge) | `worldMapLayout` flags `comingSoon: true` (Frostpeak, Sun Reach) |
| Progress (e.g. "12 of 16 charted") | `realmProgress(chronicle)` → `{ revealedCount, total, percent }` |

`worldMapLayout.ts` shape (one entry per region):
`{ id, name, x, y, icon: 'castle'|'town'|'tower'|'lighthouse'|'forest'|'mountains'|'marsh'|'mist', tier?, settlement?, comingSoon?, home? }`
— `id`/`name` must match the real `balance.realm.atlases[].regions[]` entries.

## Interactions
- **Hover** a region → lift + gold glow (CSS, as in the mockup) — signals it's clickable.
- **Click a charted region / settlement** → fire `onEnterTown(regionId)` (≈300ms fade) → Level 1 town view (built in a later feature). For now, wire the click to a stub/town-placeholder.
- **Uncharted / coming-soon** → not clickable (or a gentle "not yet discovered" tooltip — never punishing).
- Clicking the **Cartographer's Tower** (in town) returns here (later feature).

## Rendering
- Inline SVG in React (viewBox `0 0 1200 820`), **render-on-change** (no animation loop) — the map only changes when a region is charted. No engine, no new dep.
- Parchment/frame/compass/legend/title = static SVG (lifted from the mockup). Regions = mapped from `worldMapLayout` + charted state.
- Honor `prefers-reduced-motion` (skip the fade) and the colorblind rule (charted vs uncharted distinguished by **dashed outline + mist + label**, not hue alone; the "current/selected" region gets a non-hue cue).

## Acceptance check (definition of done)
- Map renders in the app at the approved storybook look; all real regions appear in correct states; charting a region (via a completion/expedition) flips it from misted → glowing **without decay**; clicking a settlement fires the enter-town intent; progress count matches `realmProgress`.
- `npm run typecheck` clean (main + renderer); `pw:realm` driver passes against built `out/`; user sees it in the real app and accepts the look.

## Irreversible gates (none crossed by this feature — confirm if any arise)
Renderer-only. Does **NOT** touch db schema, `saveDatabase` deep-merge/validate, preload/IPC/sandbox, or add npm deps. ADDS files + one toggle (never deletes `realm.ts`/`chronicle.ts`/garden engine). If any of those become necessary → **STOP and ask** for that specific action.

## Build order (sub-features, each its own OK + test steps)
1. `worldMapLayout.ts` (data only) + the icon sprite — no UI yet.
2. `WorldMap.tsx` static render (parchment + frame + regions in charted/uncharted/settlement/coming-soon states) behind the toggle. Test: open Realm tab, see the map.
3. Wire hover + click-to-enter-town stub. Test: hover lifts, click logs the region.
4. Bind live `realm.ts` state (chart a region → it lights up; verify ↩ Restore reverses exactly). Test: `pw:realm`.

## Test steps for the user (per sub-feature)
Plain-English "open the app → Realm tab → you should see the parchment map; hover a region, it lifts; complete a test quest in an isolated profile, watch a misted region light up gold; press ↩ Restore, watch it return exactly." Given before each sub-feature ships.
