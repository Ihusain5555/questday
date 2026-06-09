# QuestDay Design System — MASTER

Single source of truth for the UI rebuild. Every screen obeys this. Tokens live in
`src/renderer/styles.css` `:root`; this doc explains the intent. Re-tune tokens, not
hardcoded values.

Product class: **Gamified habit-tracker × RPG × desktop dashboard.**
Named style: **Clay Fantasy** — claymorphism (soft, tactile, squishy 3D depth) applied
to a dark fantasy world. Derived with the UI/UX Pro Max reasoning engine + research on
Duolingo / Finch / Habitica.

## Personality
Premium, tactile, fantasy, night. Motivating, never punishing (product rule). Vibrant,
NOT muted — gamification wants energy. Things feel physical: surfaces puff out like clay,
buttons squish when pressed, rewards are gold treasure.

## Color (semantic — never raw hex in components)
- Surfaces: deep emerald-ink. `--bg #0e1512`, `--panel #16201b`, `--panel-2 #1e2a23`,
  `--border #2c3a32`. Text `--text #eaf2ec`, `--muted #93a89a`.
- `--brand` emerald `#2fb380` (+`--brand-deep #1f8a60`, `--brand-bright #3fe0a8`) — primary action.
- `--gold` `#f5b938` (+bright/deep) — XP, coins, treasure, the "ready/claim" reward state.
- `--fire` `#ff7a45` — streak.
- `--candy` `#ff6b6b` — high-energy accent / celebration pops (sparing).
- `--plum` `#b566d6` — rare/special (sparing).
- Priority: critical `--candy`, high `--gold`, medium `--brand-bright`, low `--muted`.

## Typography
- Display: **Clash Display** (600/700) — headings, quest titles, stat values.
- Body: **Satoshi** (400/500/700) — everything else. Self-hosted (offline).
- Scale: h1 26, h2 19, card-title 17, body 14–15, label 11–12 (uppercase, tracking .06em).

## Shape & depth (claymorphism)
- Radii: cards `--r-card 20px`, buttons `--r-btn 14px`, tiles/inputs `--r-sm 10px`, pills 999px.
- Clay surface = soft puffed look: layered drop shadow + faint inner top highlight.
  `--shadow-clay: 0 1px 0 rgba(255,255,255,.04) inset, 0 2px 6px rgba(0,0,0,.25), 0 14px 32px rgba(0,0,0,.40)`.
- Chunky pressable button = hard bottom shadow that collapses on `:active`.

## Motion
- Spring easing `--ease-spring cubic-bezier(.34,1.56,.64,1)`; standard 150–300ms.
- Press = squish (scale .96 + small translateY). Hover = subtle lift / brighten.
- Reward moments: count-up, gold pulse, coin-fly. ALWAYS respect `prefers-reduced-motion`.

## Icons
- **Phosphor** (`@phosphor-icons/react`). NEVER emoji as icons (emoji render per-OS,
  read as un-premium). Emoji are allowed ONLY as deliberate *content/art*: the garden's
  harvestable plant tiles and each arcade game's identity sprite.
- **Weight convention** (consistency = one deliberate system, per research):
  - `fill` → objects/nouns & status (coins, trophy, flame, sword, crown, plant, weather, nav).
  - `bold` → action glyphs (check, X, carets, arrows, plus, skip, trash, download).
- **Sizing**: 13–16 inline/badges, 16–20 headers/buttons. Optical-size round icons slightly larger.
- **Accessibility**: every icon-only button has an `aria-label` (not just `title`); pair icons
  with text labels where space allows; keep ≥3:1 contrast.
- Reward economy glyphs (coins/flame/sword/star) colored by token. Custom gold LevelStar SVG kept.

## Anti-patterns (BANNED — from the Pro Max engine + research)
- ❌ AI purple/blue gradients, neon. ❌ emoji used as icons. ❌ system/Inter-default type.
- ❌ flat 1px-outline cards with identical radius everywhere. ❌ dead hover states / harsh snaps.
- ❌ contrast < 4.5:1. ❌ missing keyboard focus. ❌ ignoring `prefers-reduced-motion`.
- ❌ punitive mechanics (health loss, shame, point deduction) — product law.

## Per-screen checklist
- [ ] Phosphor icons, no emoji-as-icon  [ ] clay surfaces + correct radii  [ ] spring press on buttons
- [ ] `:focus-visible` ring  [ ] hover 150–300ms  [ ] tokens not raw hex  [ ] contrast AA  [ ] tone: motivating

## Rollout status
Foundation + widget: DONE. Main window (shell/nav/Dashboard → Quests → World → Arcade →
Stats → Active mode → Time frames → Data) + friction window: IN PROGRESS.
