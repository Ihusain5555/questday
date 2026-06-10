---
name: playwright-verification
description: How to verify QuestDay changes by driving the real app with Playwright. Use when testing/verifying a feature, writing or running a pw driver, or before shipping.
---

# Playwright verification

There are no unit tests. Verification = driving the real Electron app with
`playwright-core`'s `_electron`. Each feature gets its OWN driver so parallel work never
clobbers a shared script:
- `scripts/pw-run.mjs` → `npm run pw` (current/active feature)
- per-feature: `pw-arcade.mjs` → `npm run pw:arcade`, `pw-eisenhower.mjs`, `pw-timeboxing.mjs`,
  `pw-main.mjs`, `pw-widget.mjs`, …

When you add a feature, **add/extend ITS driver — never overwrite another feature's.**
Run `npm run build`, then the matching `npm run pw*`, then read the PASS/FAIL lines +
screenshots in `pw-shots/`. Launching opens real windows (Electron is GUI).

## Critical safety
- Tests run against the REAL user-data dir (`%APPDATA%\questday\db.json`) where the user has
  real data. The driver MUST stash db.json before seeding and restore it in a `finally`
  (`pw-run.mjs` does this — keep the pattern when rewriting).
- The machine clock decides which time frame is "active" (and thus the current quest) — seed
  quests into the frame covering "now" (the script computes `activeFrame`).
- **Single-instance lock:** if ANY QuestDay is running (installed app in tray, a dev session,
  a stale electron.exe), new launches quit instantly with "Target page... has been closed".
  Kill first: `Get-Process QuestDay,electron | Stop-Process`. Relaunch the user's installed
  app afterwards (`%LOCALAPPDATA%\Programs\QuestDay\QuestDay.exe`).
- `npm run pw:arcade` etc. route through `scripts/with-app.mjs` (claims the shared app-lock).

Tip: delegate the run to the `test-runner` agent so only PASS/FAIL + failures return.
