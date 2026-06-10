---
name: parallel-worktrees
description: Git worktree workflow for building multiple QuestDay features in parallel without clobbering. Use when starting a new feature, working in a separate terminal/session, or coordinating app access.
---

# Parallel work (git worktrees)

`main` = baseline. Multiple terminals/sessions may build different features at once — isolate:

- **One feature, one worktree+branch.** Create with `node scripts/new-worktree.mjs <name>` —
  makes `C:\Users\ihusa\questday-wt\<name>` on `feature/<name>` and junctions `node_modules`.
- **Never `npm install` in a worktree** — the junction already resolves the OneDrive
  electron-extract gotcha; `npm run typecheck` works immediately.
- **Editing + `npm run typecheck` are parallel-safe.** The ONE thing that collides is
  *opening the app* (single-instance lock + one save file).
- **`node scripts/with-app.mjs <terminal> <cmd>` wraps every app-open safely**: claims the
  shared cross-terminal lock (`C:\Users\ihusa\questday-coordination\app-lock.mjs`), kills
  strays, runs, always releases. `npm run dev`/`dist`/`pw:arcade` already route through it; if
  it's BUSY they refuse instead of clobbering.
- **Don't commit another feature's half-done WIP into a release.** `npm run dist` ships the
  whole working tree — only run it from a branch where the tree is complete and green. Merge
  finished branches into `main`, then ship from clean `main`.
