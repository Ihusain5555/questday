# CLAUDE.md

QuestDay is a Windows-first **Electron + React + TypeScript** desktop app (electron-vite):
a quest-based daily productivity guide with an always-on-top widget that surfaces the single
highest-priority "current quest". Local JSON only — no accounts, no cloud.

**Tone rule (always applies):** motivating, never punishing — never add health/lives loss,
point deduction, streak-shaming, or any punitive mechanic. (One sanctioned exception:
↩ Restore reverses an accidental completion's payout exactly — correction, not punishment.)
The garden only ever GAINS — no wilt/decay.

## Commands

```powershell
npm run dev        # live dev (widget + main window, hot-reload)
npm run build      # compile to out/
npm run typecheck  # tsc for main (node) + renderer (web) — run before considering done
npm run pw         # drive the app with Playwright, screenshots -> pw-shots/
npm run dist       # build the NSIS installer -> C:\Users\ihusa\questday-release\
```

No unit tests — **verification is driving the real app with Playwright** (per-feature drivers).
→ See the **playwright-verification** skill for how to write/run drivers safely.

## Architecture (map)

Three renderer windows, one main process:
- **main window** (`src/renderer/app/`) — management UI (tabs: Dashboard, Quests, Time frames,
  Focus, Matrix, World, Arcade, Stats, Active mode, Data). Tabs use **Phosphor icons**.
- **widget** (`src/renderer/widget/`) — always-on-top current quest + sub-task.
- **friction window** (`src/renderer/friction/`) — soft-friction prompt popup.
- **main process** (`src/main/`) — windows + tray, JSON store, backups, active-mode scheduler,
  typed IPC. State flow: renderer → `store.saveState(patch)` IPC → atomic JSON write →
  broadcast `store:changed` → every window's zustand store updates.

Pure engines live in `src/shared/engine/` (current-quest scoring, rewards, garden, stats,
rollover, recurrence, active mode, eisenhower).
→ See the **codebase-overview** skill for the full directory + engine breakdown.

## Conventions (where things live)

- **ALL tunable numbers** → `src/shared/config/balance.ts` (XP/level/streak, scoring weights,
  garden economy under `garden.*`, arcade tickets/payouts). Never hardcode weights in logic.
- **ALL visual design tokens** → `src/renderer/theme.css` (`@import`ed at top of `styles.css`).
  Reference `var(--brand)` etc., never raw hex. Title-bar emerald `#10362a` is duplicated in
  3 spots that must stay in sync: `--titlebar` (theme.css), `titleBarOverlay.color`
  (`src/main/index.ts`), and the `.titlebar` background.
- **App version** is injected at build time from `package.json` via Vite `define`
  (`__APP_VERSION__`). The title bar reads it — no manual version strings in the UI.
- **Shared types** → `src/shared/types.ts`. **Defaults + migration seed** → `src/shared/defaults.ts`
  (`createDefaultDatabase`); the migration in `src/main/db/store.ts` stays tolerant of
  older/missing fields (`...fresh ... ...db`).
- **Preload bridge** → `src/preload/index.ts` exposes `window.questday.*`. New IPC = add there +
  handler in `src/main/ipc/` + register in `src/main/index.ts` `whenReady`.
- **Persistence** is local JSON only (`%APPDATA%\questday\db.json`, atomic temp+rename) with
  rotated auto-backups. No accounts, no cloud — keep it that way.
- **Icons vs emoji (post-v1.7):** UI chrome uses Phosphor icons; emoji reserved for content/
  decoration and render via the bundled Twemoji color webfont.
- **Toggleable features:** new optional feature = one `features.ts` entry + one App.tsx tab +
  one `enabledFeatures` key (data is never deleted, only the tab hidden — tone rule).
- Style: 2-space indent, named exports, Prettier-ish, comments explain *why* (cite spec §).

## Working in parallel & shipping

Multiple sessions may build different features at once — **isolate** with one worktree+branch
per feature, and claim the shared app-lock before opening the app (single-instance + one save file).
→ See the **parallel-worktrees** skill for the worktree flow.
→ See the **shipping-and-gotchas** skill for `npm run dist`, the install-it-for-the-user steps,
  and the known build gotchas (electron extract, winCodeSign, single-instance, db.json stashing).

## Standing guidance (efficiency)

- **Prefer CLI tools over MCP servers** when both exist (`gh`, `aws`, `gcloud`, …) — tighter
  output, and no extra tool schemas loaded into context.
- **Delegate verbose operations to subagents** — running test suites, fetching docs, scanning
  logs/backups — so only the summary returns to the main thread. Use the `log-reader` and
  `test-runner` (haiku) agents in `.claude/agents/`.
- **Build and test incrementally, one file at a time** — after each file run `npm run typecheck`
  (and the relevant `npm run pw*` driver) before moving on; don't batch many edits then compile.

## When summarizing / compacting this conversation, KEEP:

- Exact code changes made (file paths + what changed) and any diffs not yet committed.
- Test / typecheck / Playwright output — especially failures, error messages, PASS/FAIL lines.
- The current task, the plan, and which step we're on.
- User decisions and constraints (chosen options, the tone rule, the "install it for me" request).
- Open questions awaiting the user.
DROP: resolved exploration, full file dumps already acted on, superseded approaches.

## Token-saving reminders (proactively suggest, ONE short line, at the optimal moment)

- Switching to an unrelated task → suggest `/clear` to drop stale context.
- Session getting long → suggest `/compact` to shrink it.
- After large operations → suggest checking `/context` and `/usage`.
- Unused MCP servers loaded → remind they can `/mcp` to toggle them off.
- Task difficulty ≠ active model → suggest `/model` (Sonnet default, Opus only for hard architecture).
- Simple task, no deep reasoning needed → suggest lowering `/effort`.
- Vague request → ask for specifics (e.g. "add validation to login in auth.ts") before scanning.
- Before a complex task → suggest plan mode (Shift+Tab).
- Heading the wrong way → remind they can press Esc to stop, `/rewind` to roll back.
- A task would benefit from it → ask for verification targets (test cases, expected output, screenshots).
- After recommending plugins that need confirmation → remind them to install.

## Deferred (do NOT build without explicit go-ahead)

Code-signing the installer (needs a purchased cert). No calendar/integrations, no cloud/accounts,
no badges/leaderboards (v1 non-goals).
