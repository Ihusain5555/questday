---
name: shipping-and-gotchas
description: How to build the QuestDay installer, install it for the user, and the known Windows/Electron build gotchas. Use when running npm run dist, shipping a release, or hitting a build/launch failure.
---

# Shipping a release

The user runs the INSTALLED app day-to-day. After shipping a feature (standing request,
2026-06-06): `npm run dist`, then install it for them:
1. Quit QuestDay (`Get-Process QuestDay,electron | Stop-Process`).
2. Run the new setup exe silently:
   `Start-Process "...questday-release\QuestDay Setup X.Y.Z.exe" -ArgumentList '/S' -Wait`
3. Verify the installed version, then relaunch
   `%LOCALAPPDATA%\Programs\QuestDay\QuestDay.exe`.

`npm run dist` builds the NSIS installer → `C:\Users\ihusa\questday-release\`.

# Website (Vercel landing page)

The marketing/download site is a **separate Next.js 14 App Router project in `website/`** (its own
`package.json`/`node_modules`; NOT part of the Electron app — the zero-dep rule is for the app, not the site).
It's a faithful port of the approved `mockups/website-mockup.html`; download buttons point to
`github.com/Ihusain5555/questday/releases/latest`. Build: `cd website ; npm install ; npm run build`.

- **You CAN deploy from here** — the Vercel CLI is already authenticated (`npx vercel whoami` → `ihusain5555`;
  deployments land under scope `ihusain5556`). First deploy (2026-06-28) is LIVE:
  `https://website-virid-six-hmzgotbvpo.vercel.app`.
- **Deploy command:** `cd website ; npx --yes vercel --prod --yes`. The `--yes` auto-links the project (creates
  `.vercel/`, gitignored) and ships to production non-interactively. Build runs on Vercel (~25s, static prerender).
- **Default Deployment Protection gotcha:** the deployment-specific `…-<hash>.vercel.app` URL returns **302 → Vercel
  SSO** (protected). The **production ALIAS** (e.g. `…-virid-six-….vercel.app`, from the deploy output's "Aliased"
  line, or `vercel ls`) is the PUBLIC URL — smoke-check THAT (`curl -L`), not the deployment URL. Turn protection off
  in Project → Settings → Deployment Protection if every URL should be public.
- **Project name = the folder (`website`)** → an ugly URL; rename to `questday` in the dashboard for a clean one (no
  reliable CLI rename in recent versions). Deploying to **production is outward-facing → confirm with the user first**
  (the first deploy was explicitly authorized).
- The download buttons **404 until a GitHub Release exists** — publishing one (`npm run dist` → Release → upload
  the `.exe`) is a separate stop-and-confirm publish step.

# Gotchas

- **Electron binary won't extract on `npm install`** under the OneDrive path (bundled
  `extract-zip` silently no-ops). Fix: manually extract the cached zip from
  `%LOCALAPPDATA%\electron\Cache\<hash>\` into `node_modules\electron\dist` and write
  `node_modules\electron\path.txt` containing `electron.exe`.
- **electron-vite emits the preload as `index.mjs`** (project is `"type":"module"`). Main
  references `../preload/index.mjs` — keep that.
- **Foreground detector** (`src/main/activeMode/detector.ts`) runs a persistent PowerShell
  process via `-File <tempfile>.ps1` (NOT `-Command`, which mangles the embedded C# here-string).
  No native module, no admin. Killed on `before-quit`.
- **Installer build (winCodeSign)**: electron-builder's `winCodeSign` package has mac symlinks
  Windows can't extract without admin/Developer Mode. If `npm run dist` fails on it, pre-extract
  the cached `winCodeSign-*.7z` (excluding `darwin`) into
  `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`, then re-run.
- **Single-instance lock**: any running QuestDay (tray app, dev session, stale electron.exe)
  blocks new launches incl. `npm run pw`. Quit/kill first, relaunch the installed app when done.
- **Gitignored DEV-ASSET imports break the macOS cloud build + leak unlicensed art into the
  installer** (cost a failed release 2026-06-19, v1.14.0). A module that statically
  `import`s a gitignored dev asset (e.g. `import x from '../assets/dev/foo.png'`) is **NOT
  tree-shaken** out of production even behind an `import.meta.env.DEV` guard — asset imports
  are side-effectful, so Rollup keeps the module. Consequences: (a) the asset BUNDLES into
  the NSIS/dmg installer (licensing risk if not CC0/bundle-safe), and (b) the **Mac cloud
  build FAILS** ("Could not resolve …png" — the gitignored file is absent on a fresh git
  checkout) while the LOCAL build silently passes (file present on disk). **Before every Mac
  release, run `ls out/renderer/assets/*.png` and confirm there are no dev images.** Fix =
  un-wire/empty the importing module (done: TownPlacer un-wired from RealmView; `townArtImages`
  `TOWN_ART_IMG = {}`). Re-add the imports locally only to use the dev tooling.
