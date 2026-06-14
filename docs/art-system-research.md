# QuestDay Art System — Research & Options

_Researched 2026-06-13. Method: 35-agent parallel web sweep (~1.5M tokens, 492 web lookups) across 12 angles + primary-source licensing audit on 16 sources + completeness critic + gap-fill round. Confidence labels: **(a)** confirmed across multiple/primary sources · **(b)** single-source · **(c)** unverified, needs an eyeball._

> **For Ibraaheem:** This answers your paused question — "is building art from scratch the right method, or are there open-source things we can leverage, and what's the ideal *system*?" Short version below, full detail under it. You don't need to read code anywhere in this doc.

---

## TL;DR — the decision in five sentences

1. **Do not build the art from scratch, and do not flip free packs as-is.** The winning model (and what the research overwhelmingly supports) is a **hybrid: lean on free CC0 art for raw material, and build only one thin custom layer — the "Grade" — that makes it all look like one premium world.**
2. The biggest strategic insight from the research: art isn't one task, it's a **pipeline of ~9 stages**, and **Kenney.nl alone covers art + UI + particles + audio under one identical CC0 license** — so if you anchor on Kenney, the "make mismatched free stuff match" problem mostly disappears and the legal/credits work becomes trivial.
3. **The LOOK question is now half-answered (see §8):** a focused follow-up confirmed that **no free 2D art reads "premium" as-is** — premium comes from the **Grade** plus a **3D-prerender (Route 2, recommended)** or a **commission**. The remaining call is purely which *style* you prefer — a taste decision, shown in `art-look-directions.html`.
4. **Licensing is the real risk, and it's mostly solved:** CC0 (Kenney, Screaming Brain, ambientCG, Poly Haven, Freesound-CC0) is bulletproof to ship; a few high-value sources (game-icons.net, Twemoji) are CC-BY = ship-safe *with a credit line*; and there's a clear **AVOID list** (CraftPix, Unity/Unreal store packs, Inkarnate, Wonderdraft bundled assets, Habitica's art, raw AI output as your signature look).
5. **Build-vs-leverage is decided per layer:** leverage everything for sources/audio/textures/map-geometry; build-from-scratch only the small, zero-dependency **render + grade + animation** layer.

---

## 1. The reframe: your art is a 9-stage pipeline, not a pile of buildings

You asked about "the map" and "the buildings," but the spec actually ships a whole world. The research found the list was blind to several stages the app needs. Here's the full system, and where each stage should **leverage** vs **build**:

| # | Pipeline stage | What it covers | Build or leverage? |
|---|---|---|---|
| 1 | **Source art** | World map, iso buildings, biomes, decoration | **Leverage** — CC0 packs |
| 2 | **Icons** | Building/resource/quest symbols, map markers | **Leverage** — game-icons.net + Phosphor (have) |
| 3 | **Textures** | Parchment, paper grain, grass/water/ground, fog | **Leverage** — ambientCG / Poly Haven (CC0) |
| 4 | **Audio** | Ambient town loop, UI/celebration SFX, bonfire crackle | **Leverage** — Kenney Audio + Freesound CC0 |
| 5 | **VFX / particles** | Confetti, gold-bloom, chimney smoke, dust | **Leverage art** (Kenney Particle Pack) + **build** tiny emitter |
| 6 | **Animation** | "Building rises," swaying banner, water shimmer | **Build** — zero-dep CSS/Web Animations + Penner easing |
| 7 | **Fonts** | Map labels, region names, banners | **Leverage** — OFL fonts (Cinzel, IM Fell, MedievalSharp) |
| 8 | **Rendering** | Drawing the map + town on screen | **Build** — plain SVG (map) + Canvas (town), zero deps |
| 9 | **The Grade** ⭐ | The one treatment that unifies stages 1–8 into one look | **Build** — your moat, build-time ImageMagick + runtime CSS |
| — | **License manifest** | Per-file source+license proof (a spec acceptance criterion) | **Build** — tiny JSON manifest + Node verify, or REUSE/SPDX |

**The strategic punchline (from the completeness critic):** anchor on **one coherent CC0 ecosystem** end-to-end. Kenney covers stages 1, 2, 3-ish, 4, and 5 under *one identical CC0 license* — which means the unification problem the Grade exists to solve is already half-solved before you start, and the credits file becomes near-trivial.

---

## 2. Strategic options (build vs buy vs generate vs commission vs hybrid)

This is "what options there are" at the top level. Pros/cons in plain English; my position at the end.

**Option A — Build everything from scratch / hand-drawn.**
- ➕ Fully bespoke, total control, fully owned.
- ➖ You don't draw; it stalls the project for weeks/months on exactly the open-ended friction work you lose hours to. **Rejected.**

**Option B — Use free CC0 packs as-is, no restyling.**
- ➕ Fastest, free, 100% legal (with CC0).
- ➖ Looks generic/free; won't hit emerald-gold parchment premium; the map stays flat. The trap most failed indie apps fall into. **Rejected as the endpoint** (fine as a prototype step).

**Option C — Curate CC0 + build the Grade (HYBRID).** ⭐
- ➕ Premium cohesive look without art skill; one system scales to all future art; zero new runtime dependencies; fully commercial-safe; matches how you actually build. The Finch/Forest/Stardew "owned look" strategy, but reached cheaply via CC0 + a treatment instead of an art team.
- ➖ The Grade is one real up-front investment; and there's a look-risk to validate (see §3).

**Option D — AI-generate the whole signature look.**
- ➕ Unique, can match any described style; cheap/fast.
- ➖ **Pure AI output is NOT copyrightable in the US (2026, post-Thaler, Supreme Court declined to revisit)** — you can ship it but you get *zero exclusivity*; a competitor could legally copy your map. Also per-platform infringement liability sits on you. **Rejected as the shipped signature; keep AI for build-time ideation only.**

**Option E — Commission a custom buyout set (Fiverr/Upwork work-for-hire).**
- ➕ Owned, coherent, on-brand = a real moat. How the polished cozy apps actually get their look.
- ➖ Costs money (realistically a few hundred $+ for a hero set); only "commercial-safe" if the contract explicitly transfers full rights. **Best as Phase 2**, after CC0 validates the design.

### My position
**Option C (Curate + Grade) as the spine, with E (commission a few hero pieces) reserved for Phase 2 and D (AI) used only for build-time ideation.** This is the survivable, sustainable choice: it ships without art skill, scales to every future stage with one system, stays legally bulletproof, and leaves a clean upgrade path to owned hero art once the design is proven.

---

## 3. THE key sub-decision: how do we get art that reads "premium"? (4 look-routes)

This is the genuine open question — everything above is settled, this is not. Within Option C, there are four ways to source the actual building/map art. The risk the research repeatedly flagged: **recolored flat/pixel CC0 art may read "sim game / mobile," not "premium emerald-gold."** Here are the routes, fitted to your brand:

**Route 1 — Recolor flat/pixel 2D CC0 (Kenney, Screaming Brain).**
- ➕ Zero tooling, drops straight in, bulletproof CC0, fastest.
- ➖ Highest risk of reading "free/flat"; Kenney's clean look isn't painterly-premium out of the box. _(fit: works, look-risk high)_

**Route 2 — Pre-render free 3D CC0 kits into premium 2.5D sprites (KayKit, Quaternius, Kenney 3D town kits, via Blender at build time).** ⭐ highest ceiling
- ➕ **Highest-quality CC0 path** — render crisp isometric sprites at any resolution with *controllable emerald/gold lighting*; KayKit is the best-looking CC0 medieval set on the web. Still zero runtime deps (Blender is build-time only).
- ➖ Adds a one-time Blender render step (I'd drive it; you don't touch it). _(fit: best look, modest setup)_

**Route 3 — AI-generate to a locked style, then human-edit (so it's partly copyrightable + owned).**
- ➕ Can nail the exact emerald-gold painterly look; Scenario/Leonardo can lock one consistent style across many assets.
- ➖ Copyright caveats (§2-D); subscription cost; still needs human editing on top to be defensible. _(fit: flexible, legal asterisks)_

**Route 4 — Commission the hero pieces (map frame + a few signature buildings).**
- ➕ The actual premium moat; owned outright.
- ➖ Money + lead time. _(fit: best ownership, Phase 2)_

**My position on the look (revised after the §8 firm-up):** **Route 2 (3D-prerender) is the lead, not a fallback.** The follow-up research confirmed that recolored flat 2D CC0 art will *not* read premium — the polished free sets achieved their look via 3D-prerender, and genuinely painterly 2D iso buildings are all paid/no-bundle. So: anchor on **KayKit** (CC0 3D), render to iso sprites with an emerald-gold light rig, then Grade. Keep **Route 1 only as a fast placeholder** to build the render/unlock/celebration spine before the final art is ready. **Route 4 (commission a few hero pieces)** layers on later. If you prefer your clean vector brand over painterly, the **vector-iso** path (Artyom Zagorskiy's CC0 SVG kit) is the real alternative. See `art-look-directions.html` to pick the style.

---

## 4. The recommended toolchain, stage by stage (the concrete menu)

All licenses below are from the primary-source audit unless marked. "Ship-safe" = safe to bundle in your distributed installer.

### Stage 1 — Source art (CC0 spine)
- **Kenney.nl** — CC0 **(a, confirmed via Kenney's own support page + statements)**. ~40k assets: Isometric City/Buildings/Landscape (128 each), Medieval RTS (120), Fantasy Town Kit (160, 3D), Castle Kit (75, 3D), Cartography Pack (85), Fantasy UI Borders (140), UI Pack–Adventure (130). **The spine.**
- **Screaming Brain Studios — Isometric Tiles family** — CC0 **(a)**. 443 town/roof/wall building parts + 1000+ floor tiles, already 2D PNG (no render step). Best no-tooling town start.
- **Feudal Wars medieval set** (OpenGameArt) — CC0 **(a)**. Distinct building *types* (houses, castle, blacksmith, barracks, towers) — maps perfectly onto "unlock the blacksmith, then the barracks." _Note: each building is a separate OGA upload; confirm CC0 per page._
- **KayKit (Kay Lousberg) Medieval Builder** — CC0 **(a)**. Highest-quality CC0 medieval set; **3D** → Route 2 pre-render.
- **rubberduck Isometric Medieval Buildings** (OGA) — CC0 **(a)**. A few warm/cozy hero houses with Blender sources.

### Stage 2 — Icons
- **game-icons.net** — **CC-BY 3.0 (a)** — ship-safe *with a credit line*. 4,180+ fantasy SVG icons; 189 buildings, 26 towers, resources, banners. No other free set comes close. _Cost of the credit ≈ zero since the spec already mandates a credits manifest._
- **Phosphor** (already in app, MIT), **RPG-Awesome** (OFL font, no attribution) as a supplement.

### Stage 3 — Textures (for the Grade & parchment)
- **ambientCG** — CC0 **(a)**: seamless paper/parchment, grass, water, ground, fog. License explicitly permits bundling.
- **Poly Haven** — CC0 **(a)**: textures + HDRIs; license permits redistribution "in a product you sell."
- **3dtextures.me** — CC0 **(a)**: parchment/paper/fabric.

### Stage 4 — Audio
- **Kenney Audio packs** (RPG/UI/Interface/Impact + Music Jingles) — CC0 **(a)**. UI clicks, "building placed" chime, celebration SFX.
- **Freesound (CC0 filter)** — per-sound CC0 **(a, filter strictly)**: ambient town loop + bonfire crackle.
- _Phase 2 quality:_ **Sonniss GDC bundles** — royalty-free but **no standalone redistribution** → keep CC0 as default.

### Stage 5 — VFX / particles
- **Kenney Particle Pack** + **Smoke Particles** — CC0 **(a)**: confetti/gold-bloom/chimney-smoke "paint."
- Engine: a **~60–120 line zero-dep canvas emitter** (in-house, pattern referenced from canvas-confetti/ISC). No npm dep.

### Stage 6 — Animation (zero-dep)
- **CSS `steps()` sprite animation** + **Web Animations API** (`element.animate`) for "building rises" — animates a static PNG, no new art.
- **Robert Penner easing equations** — BSD/MIT math, ~6 lines each (easeOutBack for the cozy overshoot). _TRAP: the easings.net repo is GPL-3.0 — inline Penner's math, don't copy that repo._

### Stage 7 — Fonts (OFL, bundleable)
- **Cinzel / Cinzel Decorative**, **MedievalSharp**, **IM Fell English**, **Uncial Antiqua** — all **SIL OFL 1.1 (a)**; OFL FAQ explicitly sanctions bundling in software. Map labels, region names, banners.

### Stage 8 — Rendering (zero-dep)
- **Plain SVG** for the parchment world map (vector, native clickable towns, infinite-crisp zoom).
- **Plain HTML5 Canvas 2D** for the isometric town (blit pre-rendered sprites; the town only redraws on quest completion, not 60fps — no engine needed).
- _If hand-rolled pan/zoom/hit-testing gets painful:_ **Konva** (MIT, 53KB, **zero transitive deps**) is the lightest fallback — but it's one new dep. PixiJS/Phaser/Three are overkill here.

### Stage 9 — The Grade (your moat)
- **ImageMagick** (build-time only, ships nothing) — `-remap` to one palette, `-modulate`/`-colorize` for the emerald-gold tone. **(a)** The output PNGs carry the *source art's* license, not ImageMagick's.
- **Lospec** palette list (public domain) — the shared emerald-gold-parchment target ramp.
- **Runtime CSS filter / SVG feColorMatrix** — free per-state variants (resting vs active building) with zero new art.

### License manifest (acceptance criterion)
- **Hand-rolled `art-credits.json` + ~40-line Node verifier** (zero new deps) — _or_ **REUSE + SPDX** (needs Python at build time). Records `{file, sha256, sourceUrl, author, license, retrievedDate}`; build fails if any shipped art is un-manifested.

---

## 5. Licensing: ship-safe vs AVOID

### ✅ Safe to bundle in the installer
| License | Sources | Obligation |
|---|---|---|
| **CC0** (cleanest) | Kenney (everything), Screaming Brain, Feudal Wars, KayKit, rubberduck, ambientCG, Poly Haven, 3dtextures, Freesound-CC0, Kenney Audio/Particles | **None.** Optional courtesy credit. |
| **CC-BY** | game-icons.net (3.0), Twemoji (4.0, already in app) | **Credit line** in a credits file. |
| **MIT / Apache / BSD** | Konva, react-zoom-pan-pinch, Azgaar (tool), tmxrasterizer | None for art output. |
| **SIL OFL 1.1** | Cinzel, IM Fell, MedievalSharp, RPG-Awesome | Ship the OFL.txt; can't sell the font alone. |
| **CC0 (output)** | Azgaar generated maps (MIT tool, **output explicitly free for commercial sale (a)**) | None. |

### ⛔ AVOID for bundling (real traps the research confirmed)
- **CraftPix** — license **bans redistributing the raw art files**; an Electron installer ships extractable files → disqualified.
- **Unity / Unreal Asset Store packs** — licensed for use *in the engine*, not for bundling extractable files in a non-engine app.
- **Inkarnate / Wonderdraft (bundled symbol packs)** — ToS/EULA don't clearly permit bundling extractable exports; Wonderdraft's asset packs are separately licensed. _(Use Azgaar instead — MIT, output explicitly free.)_
- **Watabou** (Medieval Fantasy City / Village generators) — visually a great fit, but the license is an informal FAQ blurb that says "include in commercial *RPG adventures*," and the author **publicly disapproves of selling/redistributing generated maps**. **(c, gray zone)** — only use with a written email/DM permission for the exact use, kept on file. Default to Azgaar.
- **Habitica's art** — CC-BY-**NC**-SA (NonCommercial + ShareAlike): NC bars commercial use, SA would force-open your whole art layer. The most-cited "comparable" is exactly what *not* to copy.
- **Cup Nooble / many "free" itch packs** — NonCommercial in the free tier. Filter itch via `itch.io/game-assets/assets-cc0` and verify each pack's license line.
- **Raw AI output as your shipped signature** — not copyrightable (no exclusivity) + infringement liability. Use AI for ideation only.

**Hard rule going forward:** bundle a pack only if its page explicitly states CC0 (or CC-BY with a credit), and save a copy of that license text alongside the files.

---

## 6. Open questions that need your eyes (not more research)
1. **The look (§3):** does recolored CC0 read premium, or do we go 3D-prerender? → mockups incoming.
2. **Kenney Cartography Pack style** — confirmed CC0, but whether its icons read aged-parchment or flat-modern is **(c) unverified** — eyeball the pack page before relying on it for the world map.
3. **Pixel vs painterly vs vector** for the overall direction — a brand call. Your existing theme (Clash Display + Satoshi, clean vector) leans *against* pixel art; the vector-iso route (SVG kits) would unify more naturally but has thinner free coverage.

---

## 7. Primary sources (key ones)
- Kenney license: https://kenney.nl/support
- Screaming Brain CC0: https://screamingbrainstudios.com/downloads/
- game-icons.net license: https://github.com/game-icons/icons/blob/master/license.txt
- Azgaar license + map grant: https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/LICENSE
- SDXL license: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/raw/main/LICENSE.md
- ambientCG: https://docs.ambientcg.com/license/ · Poly Haven: https://polyhaven.com/license
- US AI copyrightability (2026): US Copyright Office position, post-Thaler; SCOTUS declined review (Mar 2026)
- itch CC0 filter: https://itch.io/game-assets/assets-cc0
- KayKit: https://kaylousberg.itch.io/kaykit-medieval-builder-pack

---

## 8. Firm-up findings (2026-06-13) — these refine §3 and §6

A focused 5-angle follow-up resolved the decision-critical unknowns:

**8.1 — Premium reality check (confirmed).** There is **no free CC0/CC-BY 2D source that reads "premium painterly" and can be bundled as-is.** The good-looking CC0 iso medieval sets (**rubberduck's**, **Feudal Wars**) got their polish *from a 3D-prerender* (Blender, baked to 2D — rubberduck even ships the .blend files). Genuinely hand-painted iso buildings (GameDevMarket, GraphicRiver, some CartographyAssets) are **paid + licensed to forbid bundling the raw files.** Conclusion: **premium comes from your Grade and/or a 3D-prerender, not the source art.**
- Best CC0 **2D** base if you go that way: **Feudal Wars set** (one coherent author — houses/castle/blacksmith/stable/barracks/towers) + **rubberduck** (fidelity) + **Daniel Andersson Medieval House Pack** (variety). All CC0.
- **New trap:** **maxparata "Isometric Medieval Town"** (550+ sprites) is **CC BY-ND (NoDerivatives)** — ND forbids recoloring/grading, which kills the Grade plan. **Avoid.**
- CC0 **watercolor terrain textures** exist (Voxel Core Lab, 16 textures) — great for the parchment map + a painterly Grade overlay.

**8.2 — 3D-prerender (Route 2) is confirmed realistic & is the lead.** Best CC0 3D medieval kit = **KayKit (Kay Lousberg)** — Medieval Builder (200+) + City Builder Bits; CC0, bundling renders is safe. **Kenney** Fantasy Town Kit (160, 3D), Castle Kit (75, 3D), Medieval Town Base (65, **untextured = easy to recolor**) all CC0 glTF. **Quaternius** = secondary/props. **Poly Pizza** = mixed-license aggregator, filter to CC0. Workflow: one Blender iso `.blend` template (orthographic cam at iso angle, transparent PNG) + an AI-written `render.py` + a **3-light rig (gold key / emerald rim / soft fill)** for the brand glow. Effort for you = **low on code (AI writes it), moderate on taste** (judge renders, tweak "warmer gold / stronger emerald rim"). Ceiling = "polished cohesive mobile city-builder" = **exactly QuestDay's target.** Stays zero-runtime-dep (Blender is build-time).

**8.3 — Vector-iso is viable but thin.** One solid true-vector CC0 medieval kit: **Artyom Zagorskiy "Isometric Medieval Pack"** (269 SVG/EPS tiles — houses, blacksmith, mill, castle, towers, biomes). Unifies best with your Phosphor/SVG brand. But one kit won't fill an Empire-scale world → needs in-house extension. **unDraw is OUT** (license forbids bundling its art in a product). Kenney's vector-iso line is **modern-city only**, not medieval. OpenMoji is CC-BY-**SA** (copyleft creep) — avoid for modified use.

**8.4 — Eyeball verifications.** Kenney **Cartography Pack** copy says "drawings and scribbles… seamless paper textures" → reads **hand-drawn parchment/old-map** (good for the world map), ships a vector source for clean recolor — but still **(b) verify by eye** before committing. Kenney Town/Castle/Base = **3D glTF** (feed the prerender). **Screaming Brain** Iso Town = real 2D PNG **but low-res 128×64 retro** → not premium.

**8.5 — Accessibility & performance (bake into the build).**
- **Colorblind:** emerald-green + gold is the **single worst pairing for red-green colorblindness (~8% of men)** — they collapse to one yellow. **Hard rule:** never let hue alone distinguish a town/state/region/building — always add a text label, icon, or distinct shape, and a clear lightness gap between any two greens. **Reserve a colorblind-safe blue (#0072B2 / #56B4E9) for the single "current/selected" highlight** (blue survives all colorblindness, contrasts with gold). Validate the final map in a deuteranopia simulator (Coblis) before shipping.
- **Reduced motion:** "no-motion-first" — default to no animation, enable inside `@media (prefers-reduced-motion: no-preference)` + a `usePrefersReducedMotion()` React hook; replace building-rise/confetti with an instant cross-fade when reduced. (WCAG 2.3.3 — a real requirement, fits the cozy tone.)
- **Performance:** art compresses well; the size risk is bundling *unused* packs, not individual sprites. Optimize at build time with **oxipng** (standalone binary, ~29–44% smaller) → then **WebP via cwebp** (often 45–74% smaller again). **Avoid @squoosh/cli (deprecated 2023).** `sharp` is a fine Node dev-only option (native libvips — keep dev-only). All zero-runtime-dep.

---

## 9. Paid options for the chosen STORYBOOK look + small budget (2026-06-13 research)

Style is locked = **Storybook Parchment**. User has a small budget + quality matters. Key facts:

**9.1 — The bundle-safety trap is the #1 money rule.** The "extractable installer" test eliminates almost every paid *marketplace*: **Adobe Stock, Shutterstock, Envato/GraphicRiver (clause 11), GameDev Market Pro (4.2.c), and the standard itch.io paid license all forbid letting end-users extract the raw file** — which an Electron app folder does. **Buying there to bundle = license violation + wasted money.** The only genuinely bundle-safe *paid* channels: **(a) AI-generated output you hold a commercial license to** (Midjourney/Scenario), and **(b) commissioned work-for-hire with written redistribution rights.** (CC0 remains the only free-and-safe channel.)

**9.2 — What money actually buys = COHERENCE (the cure for "messy").** Cohesion comes from ONE source / ONE locked style, not piece count.

**9.3 — Budget tiers:**
- **$0 (free, fully safe):** CC0 — Kenney *Sketch Town* (sketch/line, ~medium fit) + *Voxel Core Lab* watercolor terrain (CC0) + OGA *Fantasy Parchment Set* (CC0) + game-icons.net (CC-BY, credit). OR the **free 3D-prerender** (KayKit CC0 → Blender toon+Freestyle+Kuwahara watercolor post) → ~70–80% of the storybook look.
- **~$10–45 (AI style-lock — best bang-for-buck):** **Midjourney Basic ~$10/mo** (`--sref` locked style) or **Scenario Pro ~$45/mo** (trained style model; the only ToS that *explicitly* grants redistribution). Generate the whole matched set, cancel after a month, + a free human-cleanup pass (Krita/Photopea) that removes AI "mess" AND restores partial copyright. Bundle-safe. Caveat: pure AI output isn't copyrightable (no exclusivity).
- **~$19 (Penzilla, hand-drawn) — VERIFY LICENSE FIRST:** one illustrator's cohesive village + buildings + parchment map (penzilla.itch.io). Cheapest *real* hand-drawn storybook. ⚠️ Must confirm its license permits bundling in an extractable app (or email the artist) before buying; + an "Art by Penzilla Design" credit line.
- **~$200–550 (commission hero pieces — owned moat):** one artist, **work-for-hire (= you own copyright = bundle-safe)**: a parchment world map (~$150–300) + 2–3 signature buildings (~$50–80 ea). Highest quality + the only path that's a real moat. The map is the best single "hero" spend.
- **~$700–1,400:** full commissioned small town set — the "if it takes off" upgrade.

**9.4 — Position:** phased — **AI style-lock (~$10–30) now** for a coherent good-looking set that's bundle-safe, then optionally **commission the hero map (~$150–300)** later for a moat. If avoiding AI, **Penzilla (~$19)** is the cheapest hand-drawn route pending the license check.

**9.5 — Anti-"messy" QA (the guarantee):** bad art = mismatch on 7 axes — style, perspective/camera angle, scale, palette, light direction, outline weight, resolution. Pipeline that prevents it: **ONE coherent source → normalize perspective+scale → ONE warm Grade → ONE light direction → your yes/no approval per asset.** Nothing ships you haven't seen.

_Full parsed dataset (116 options, 16 license audits) + 5-angle firm-up + 6-angle storybook-budget research retained in the session output; this doc is the curated synthesis._
