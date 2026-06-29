# Arcade + UI feedback — captured 2026-06-29 (NOT built yet)

User feedback gathered at session close, to **process next session**. **Nothing here is built.**
Run each through the one-feature-at-a-time cycle (plan → user OK → build → test steps → user confirms).
The user directs by outcome and **cannot read code**, so confirm intent (and show a mockup for visual items) before building.

File map (confirmed this session):
- Arcade games: `src/renderer/app/arcade/games/{StopTap,AimTrainer,ReactionTime,ColorClash,ColorRecreation,TrackSwitch,MentalSpin,FlashRecall}.tsx`
- Arcade container/registry: `src/renderer/app/arcade/ArcadeView.tsx` · tuning: `src/shared/config/balance.ts` (`arcade.games.*`) · styles: `src/renderer/styles.css`
- Calendar/observances: UI `src/renderer/app/CalendarView.tsx` · engine `src/shared/engine/observances.ts`
- End-of-day: `src/renderer/app/EndOfDayCard.tsx` · Dashboard: `src/renderer/app/Dashboard.tsx`
- Time frames: UI `src/renderer/app/TimeFramesView.tsx` · engine `src/shared/engine/prayerFrames.ts` · types `src/shared/types.ts`

---

## ✅ DECISION #1 (DECIDED 2026-06-29) — in-game point deduction + flash feedback, arcade-score-only
> User: *"The mini games should be punishing… stop tap should take away 2 points if they tap when it says stop… aim trainer, reaction time, color clash, etc."* → clarified: *"i meant point deduction WITHIN the minigame. and make it show, like a red flash… and green flash when they get a point… maybe gold, whatever looks good."*

**DECIDED:** arcade minigames MAY deduct points **within the round's score** on a wrong action, with visual feedback.
- **Penalty:** a wrong action (e.g. StopTap tap during "STOP" = **−2**) subtracts from the **in-game round score only**.
- **Visual feedback (juice):** **RED flash** on a penalty; **GREEN or GOLD flash** on a point gain. "Whatever looks good" = designer's latitude (brief element/screen flash + the score ticking up/down). **Build a quick tunable mockup FIRST** (user is visual — sliders for flash color/duration/intensity, copy-out the values) before wiring it into the real games.
- **HARD BOUNDARY (non-negotiable):** this NEVER touches the **productivity reward world** — quest XP, levels, streaks, the arcade **tickets** awarded to the player, and **↩Restore exactness** all stay strictly **gains-only**. Deduction lives entirely in the per-round arcade score (`ArcadeState.best` still records only the best; high-score sharing unaffected).
- **This AMENDS the tone rule's arcade application** — `AimTrainer.tsx`'s "misses are never punished" is no longer absolute for the arcade. CLAUDE.md tone-rule note updated to record the carve-out.
- **Per-game build (next session):** a **shared score-flash component** (red / green / gold) reused across games; per-game "wrong action" + penalty amount in `balance.ts`. Games & their penalizable action: `StopTap.tsx` (tap during STOP), `AimTrainer.tsx` (miss / wrong target?), `ReactionTime.tsx` (jumping early), `ColorClash.tsx` / `ColorRecreation.tsx` (wrong colour).
- **OPEN design question:** is the penalty **always-on**, or only in a harder/advanced mode? The strategic depth-mode rule says *"every game keeps its simple default + an advanced mode; never remove simple."* Confirm with the user whether penalties apply to the simple default too, or only an advanced mode.

---

## Arcade — specific changes
### Track Switch — remove the guide lines
> *"Track switch shouldnt have lines showing them where to go, they should have to find it themselves."*
- Target: `TrackSwitch.tsx` — remove/hide the rendered guide path; the player must locate the target unaided. Confirm exactly what the "lines" are in the render before removing.

### Reflex (= Aim Trainer "Reflex" mode) — too easy, lingers too long
> *"Reflex game is too easy, it stays there for so long."*
- "Reflex" is a **mode of Aim Trainer**, not a standalone game. Target: `AimTrainer.tsx` Reflex mode `lifeMs` (target lifespan before it relocates) + the aim mode params in `balance.ts`. Shorten the on-screen window; scale Easy→Hard.

### Mental Spin — "mirror" is confusing
> *"Mental spin game is still kind of confusing, they arent sure what it means by mirror.. Because does that also mean the orientation can be changed?"*
- Target: `MentalSpin.tsx` — make the prompt unambiguous: what "mirror" means and whether rotation/orientation also varies.
- **OPEN QUESTION for the user:** should it test **mirror-only, rotation-only, or both** (clearly labeled)? Likely needs clearer instructions/legend and possibly decoupling "mirrored" vs "rotated."

### Flash Recall — too simple (RESEARCH still TODO)
> *"Flash recall game is too simple, theres no real challenge. Maybe make it flash in a certain order? Or they have to react before another one flashes? Do some research and think about how to make it more challenging."*
- Target: `FlashRecall.tsx` + `balance.ts`.
- User's ideas: (a) flash in a specific **ORDER** to reproduce (sequence memory / Simon-style); (b) **time pressure** — react before the next flash.
- **RESEARCH NOT DONE** (the research agent was cancelled at session close). Next session: research Simon/sequence memory, the Chimp Test (numbered-grid positional recall), Corsi block span, n-back, Human Benchmark visual-memory/sequence games, RSVP / flash-anzan speed pressure, decreasing exposure + increasing set size, distractors. Produce 4–6 concrete mechanics scaling Easy→Hard; recommend 1–2 for a fast (~20–60s) replayable arcade round.

---

## UI / feature fixes (non-arcade)
### End-of-day card — "+ more" misaligned
> *"At end of the day, the + more thing isnt aligned with the other check marks."*
- Target: `EndOfDayCard.tsx` (+ `styles.css`) — align the "+N more" row with the checkmark list above it.

### Dashboard — Realm "Coming Soon" too close to "Your Week"
> *"The your realm coming soon thing on dashboard is super close to the your week box, doesnt look nice. Add normal space like between current quest and your realm."*
- Target: `Dashboard.tsx` (+ `styles.css`) — add vertical spacing between the Realm coming-soon card and the "Your Week" box, **matching the existing gap between Current Quest and Realm**. Visual — show before/after.

### Time frames — allow mixed prayer/clock anchors (start AND end)
> *"In time frames, allow them to do from a prayer to a time, or a time to a prayer, etc."*
- Today a frame is anchored either clock OR prayer (`TimeFrame.prayerAnchor`; engine `prayerFrames.ts`). Want: **independent start and end** anchors — each can be a prayer or a clock time, in any combination (prayer→time, time→prayer, prayer→prayer, time→time).
- Targets: `types.ts` (split into independent start/end anchor, each prayer-or-clock), `prayerFrames.ts` (resolve each end independently), `TimeFramesView.tsx` (two independent anchor pickers), `store.ts` (validate new shape), defaults/migration tolerant. **SCHEMA CHANGE → stop-and-confirm.** Keep ↩Restore/reward math untouched.

### Observance calendar — recurring "White Days" flood the Upcoming list
> *"Why does it say the same thing when its past?"* — followed by ~15 identical **White Days** entries (13–15 of each Hijri month: Muharram, Safar, Rabi' al-Awwal, …), all *"Fast · recommended"* with identical text.
- Problem: monthly-recurring observances (White Days every month) repeat identically down the Upcoming list (clutter); user also suspects past days appear.
- Target: `observances.ts` (`upcomingObservances`) + `CalendarView.tsx` — **dedup/collapse recurring monthly observances** (show only the next occurrence, or group "White Days" into one upcoming entry), **exclude past dates**, and/or cap how far ahead identical recurring items list. Keep the forbidden-fast guardrail intact.
