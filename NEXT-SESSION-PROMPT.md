# ▶ NEXT SESSION — world-map LOOK is approved; next is in-app integration

Read **`HANDOFF.md`** first (precise resume-kit). Short version:

## Done & approved (2026-06-14)
- The v1.10 world-map **look is locked**: antique **"Inked Watercolor"** — `mockups/world-map-final.html`.
  Soft watercolor washes + light ink, rust **mountain-ring border**, ornate compass, swallowtail banners,
  **8 full TOWN clusters**, per-region terrain (hills/lakes/moor/groves/marsh/rivers), Embergreen=forest +
  Crownspire=mountains, and **seamless animations** (diving sea-creatures w/ shadow, wind, waves, boats — none teleport).
- Explored as 3 options (`world-map-antique-1/2/3.html`); user chose #3 then asked for the towns+terrain+living upgrade.
- Committed on branch **`feature/civilization-world-map`** (off `main`; nothing pushed). typecheck + build PASS.

## ▶ Resume here
1. **Draft the in-app integration plan and get the user's OK before coding** (they chose "commit, then plan").
   Target: re-skin `RealmMap()` in `src/renderer/app/RealmView.tsx` to this look (port palette + `#wc`/`#rough` filters,
   `ringH` border, compass, banners, seamless-anim CSS) and reconcile the **8 town clusters** with the existing 15
   Terra Questa regions (`ATLAS.regions` / `balance.realm`). Keep the `.realm-*` class hooks so `pw:realm` passes.
2. Consider deriving town buildings from `civSummary(quests)` stage (Camp→Empire) so towns GROW with completions.
3. Then the iso TOWN view (Level 1) — still blocked on the user's building-art-source decision.

## Reminders
- **It's still PLACEHOLDER vector art.** True painted fidelity = the deferred upgrade (AI style-lock or commission;
  bundle-safe = CC0 / AI-you-license / work-for-hire only). **Don't gate art on a Gemini score — it's unreliable** (see HANDOFF/CLAUDE lessons).
- The user can't read code → OK + test steps per feature; hold every irreversible gate (db schema, save logic, deps, preload/IPC, dist, push).
- Preview mockups in the MCP browser via `node scripts/_mockserver.mjs` (it blocks `file://`).
