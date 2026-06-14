# QuestDay Art System — Build Plan (feature-by-feature)

_Companion to `art-system-research.md`. This is the execution sequence for the civilization art layer, built the way your contract requires: **one feature at a time → plan → your OK → build → test steps → you confirm → next.** No code gets written until you OK each feature. Irreversible-action gates are called out explicitly._

> **Status when this was written (2026-06-13):** Strategy decided = **Option C (Curate CC0 + build the Grade)**. The civilization scaffold (Step 1) is already built + verified. The map-rebuild step was paused for this research. **Two things are waiting on you:** (1) pick the **look route** (§ Feature 0), (2) pick the **grade direction** from the grade mockup (A/B/C). Everything below assumes those two picks.

---

## How the route choice plugs in
Only **Feature 1 (source pack)** and **Feature 2 (grade settings)** change based on your look route:
- **Route 2 (pre-render 3D CC0) — RECOMMENDED primary (research §8):** source = **KayKit** (CC0 medieval) + Kenney 3D kits; adds a one-time Blender render-to-iso-sprite step (AI-scripted, you judge the renders) with a gold-key/emerald-rim light rig, then the grade. **Only realistic path to a premium look that stays free + zero-dep.**
- **Route 1 (recolor 2D CC0) — placeholder only:** source = Feudal Wars/Screaming Brain; grade = ImageMagick recolor. Fast, but the firm-up confirmed it **won't read premium** — use it to build the spine, not to ship.
- **Vector-iso alternative:** source = Artyom Zagorskiy CC0 SVG kit; best brand-fit, thinner coverage (extend in-house).
- **Route 4 (commission):** hero pieces only, Phase 2 — owned art on top of the CC0 base.

Everything from **Feature 3 onward is identical regardless of route.** So we build the whole render/unlock/celebration spine on **Route 1 placeholder art immediately**, and swap the Route 2 final art in later without rework.

---

## Feature 0 — Lock the look (NO CODE) ✅ DECIDED (2026-06-13)
- **Style = Storybook Parchment · Grade = Warm Storybook Parchment · Budget = FREE for v1.**
- **Free source:** for the **world map** the approved mockup (`world-map-storybook.html`) IS the look. For **town buildings** later: KayKit 3D-prerender (closest to storybook, needs a Blender step set up WITH the user) or Kenney *Sketch Town* (CC0, instant 2D placeholder). Decide at the town-view feature.
- **Done:** look approved-ready via the mockups; nothing else blocks coding the map.

## Feature 1 — Source assets + license manifest
- **Plan:** Download the chosen CC0 pack(s) into `resources/art/` (or `src/assets/`); create `art-credits.json` (`{file, sha256, sourceUrl, author, license:"CC0-1.0", retrievedDate}`) + a ~40-line Node verifier wired into `npm run build` that fails if any shipped art is un-manifested. Save each pack's license text alongside the files.
- **Acceptance check:** Every bundled art file has a manifest entry; the verifier passes; running it with a deliberately-unlisted file fails. (Matches the spec's "every asset traces to a CC0 license" criterion.)
- **Irreversible gates:** **none destructive**, but: (1) downloading external assets — additive; (2) the verifier is a *dev* script, **zero new runtime deps**. No npm dependency added (pure Node). If a dep ever seems needed → STOP and ask.
- **Test steps (you):** I'll show you the credits screen / manifest file and have you run `npm run build` to see the verify pass.

## Feature 2 — The Grade pipeline (build-time)
- **Plan:** A `scripts/grade-assets.mjs` (dev-only) that runs **ImageMagick** over the source art: `-remap` to the chosen emerald-gold-parchment palette + `-modulate`/`-colorize`, output static graded PNGs to `src/assets/graded/`. Add `npm run grade`. **For the recommended Route 2:** a prior `scripts/render-iso.py` Blender-headless step (ortho iso camera + gold-key/emerald-rim/soft-fill light rig) renders the CC0 3D kits → iso PNGs, which then feed the grade. _(I write both scripts; you only judge the output images.)_
- **Acceptance check:** Running the pipeline turns raw source art into a visibly cohesive **premium** emerald-gold set (the grade mockup, but on real assets). You see before/after and confirm it reads premium. _(Research §8 already established Route 1 alone won't clear this bar — Route 2's lit 3D renders are what reach it.)_
- **Irreversible gates:** ImageMagick is a **system tool / devDependency**, ships nothing in the installer — confirm install, but no runtime dep. Overwrites only files under `src/assets/graded/` (regenerable). 
- **Test steps (you):** open the generated graded sprites; compare to raw; thumbs up/down on "premium."

## Feature 3 — Productionize the parchment WORLD MAP _(the paused step)_
- **Approved look (storybook):** `mockups/world-map-storybook.html` — built & verified 2026-06-13. **Full build spec:** `docs/feature3-worldmap-spec.md`.
- **Plan:** Turn that mockup into a real React component (`WorldMap.tsx`, inline **SVG**, zero-dep) + a static `worldMapLayout.ts` (positions/icons — realm.ts has no coordinates), behind the `enabledFeatures` toggle. Reuses `realm.ts` (Terra Questa → world map) and the Chronicle inside the Cartographer's Tower (per spec — do NOT delete those engines). Charted/uncharted/settlement/coming-soon states bind to `chartedRegionIds` + `realmProgress`. See the spec for the sub-feature build order.
- **Acceptance check:** The world map renders in the app at the approved look; clicking a town fires the zoom-to-town intent; no console errors; `npm run typecheck` clean; `pw:realm` passes.
- **Irreversible gates:** touches renderer only. **Does NOT touch** db schema, save logic, preload/IPC/sandbox. If any of those seem needed → STOP and ask.
- **Test steps (you):** open app → Realm tab → see parchment map → click a town.

## Feature 4 — Isometric TOWN view (zoom 2)
- **Plan:** A **Canvas 2D** renderer (zero-dep) that blits graded building sprites on an iso grid (`screenX=(gx-gy)*tileW/2; screenY=(gx+gy)*tileH/2`), depth-sorted, with click hit-testing and pan/zoom. Buildings present = derived from all-time completions.
- **Acceptance check:** Completing quests shows the right buildings in the town at the right positions; pan/zoom works; redraw only on change (not 60fps); typecheck clean; a `pw:` town driver passes.
- **Irreversible gates:** renderer only. Pan/zoom: if hand-rolled proves painful and Konva (1 tiny MIT dep) is wanted → **STOP and ask** before adding the dep (it's against the zero-dep target).
- **Test steps (you):** complete a test quest in an isolated profile → watch the building appear in the town.

## Feature 5 — Building unlocks wired to completions (DERIVED, ↩Restore-exact)
- **Plan:** Use the existing `civilization.ts` engine: civilization state is a **pure function of all-time completions** (derived, not stored); each completion stores its exact award so **↩ Restore reverses it exactly** (tone rule). A missed day = cozy "resting" state, never decay/reset.
- **Acceptance check:** Complete → building unlocks; ↩ Restore → unlock reverses *exactly* (coin/XP claw-back math intact); skip a day → "resting," never loss. `pw:rewards` (Restore exactness) passes.
- **Irreversible gates:** **does NOT change db schema or save deep-merge/validate logic.** If the derived approach ever needs a stored field → **STOP and ask** (schema change is a hard gate).
- **Test steps (you):** complete → restore → confirm the town returns to exactly its prior state.

## Feature 6 — "Building rises" celebration (zero-dep, from default view)
- **Plan:** On completion, the new building animates in (translateY+scale+opacity with easeOutBack overshoot via **Web Animations API** + inlined Penner easing) + a **zero-dep canvas particle** burst (confetti/gold-bloom using Kenney CC0 particle PNGs). Fires from the DEFAULT view so the reward never requires pan/zoom/travel (integrity line).
- **Acceptance check:** Full reward (building + celebration + XP/streak) fires on completion without the user navigating anywhere; respects `prefers-reduced-motion` (static fallback). No new runtime dep.
- **Irreversible gates:** none destructive.
- **Test steps (you):** complete a quest from the dashboard → see the celebration without clicking into the Realm.

## Feature 7 — Audio (optional, toggleable)
- **Plan:** Bundle Kenney CC0 UI/celebration SFX + a Freesound-CC0 ambient town loop + bonfire crackle; gate behind a settings toggle (default off or low). Manifest the audio licenses.
- **Acceptance check:** SFX play on building placement/celebration; ambient loop toggles cleanly; all audio in the credits manifest; respects a mute setting.
- **Irreversible gates:** none destructive; audio files are CC0.
- **Test steps (you):** toggle sound on → complete a quest → hear the chime.

## Feature 8 — Biomes / world growth / decoration + polish
- **Plan:** Add biome tiles (CC0, graded), world-map growth Camp→Empire tiers, optional decorate mode, fonts (Cinzel/IM Fell for map labels). Each sub-item is its own small feature with its own OK.
- **Acceptance check:** per sub-item.
- **Irreversible gates:** none destructive; all behind `enabledFeatures` (data hidden never deleted — tone rule).

---

## Cross-cutting (woven through every feature)
- **Toggle:** whole feature behind one `features.ts` entry + one App.tsx tab + one `enabledFeatures` key.
- **Accessibility (hard rules, research §8.5):** emerald+gold is the *worst* red-green colorblind pairing — **never let hue alone distinguish** a town/state/region/building; always add a text label, icon, or distinct shape + a lightness gap between greens. **Reserve a colorblind-safe blue (#0072B2) for the "current/selected" highlight.** `prefers-reduced-motion`: no-motion-first via `@media (prefers-reduced-motion: no-preference)` + a `usePrefersReducedMotion()` hook; reduced = instant cross-fade instead of building-rise/confetti. Validate the final map in a deuteranopia simulator.
- **Performance (research §8.5):** build-time **oxipng** (standalone binary) → **WebP via cwebp** to keep the installer small; cache recolored bitmaps; lazy-load biomes. Avoid @squoosh/cli (deprecated). All dev-only / zero-runtime-dep.
- **Definition of done (every feature):** `npm run typecheck` clean (main+renderer) AND the relevant `pw:` driver passes against built `out/` AND the spec's acceptance check met AND (for visual tasks) you've seen it in the real app and accepted the look.

## Hard STOP-and-confirm gates (never crossed without your explicit yes for that specific action)
db.json schema change · save deep-merge/validate change · adding/removing ANY npm dependency · touching preload/IPC/sandbox/window security · deleting/renaming existing engines or views · `npm run dist` / building an installer · `git push` / force-push / branch deletion · any write to the REAL db.json (pw drivers use isolated `--user-data-dir`).

## Where we are / next to OK
- ✅ **Feature 0 DONE** — look locked (Storybook Parchment, free route); world-map mockup approved-ready (`world-map-storybook.html`).
- ▶ **NEXT: glance at `mockups/world-map-storybook.html` and OK Feature 3** — then I code the real map (sub-features in `docs/feature3-worldmap-spec.md`), zero-dep SVG, behind the toggle, verified by typecheck + `pw:realm`.
- Then **town view + Feature 2 grade** (free CC0 art), then unlocks/celebration/audio per Features 4–8.
