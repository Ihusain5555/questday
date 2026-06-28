# QuestDay — Landing Page

The marketing/landing site for **QuestDay**, the calm, private desktop deep-work
companion that structures focused work around the five daily prayers.

Built with **Next.js 14 (App Router) + TypeScript**. It is a single static page —
no backend, no database, no API calls. The download buttons link to the latest
GitHub Release of the desktop app.

## Run locally

From inside this `website/` directory:

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Other scripts:

```bash
npm run build   # production build into .next/
npm run start   # serve the production build (after npm run build)
```

## Project structure

```
website/
├─ app/
│  ├─ globals.css   # all styles (ported from the approved mockup)
│  ├─ layout.tsx    # <html lang="en">, metadata, themeColor
│  └─ page.tsx      # the full landing page (static server component)
├─ next.config.mjs
├─ tsconfig.json
├─ next-env.d.ts
├─ package.json
└─ .gitignore
```

The download buttons point to
`https://github.com/Ihusain5555/questday/releases/latest`.

## Deploy to Vercel

This site lives in the `website/` subdirectory of the QuestDay repo, so Vercel
needs to know that is the project root.

**Option A — deploy from the CLI (simplest):**

1. Install the Vercel CLI once: `npm i -g vercel`
2. Authenticate once: `vercel login`
3. From **inside this `website/` directory**, run a preview deploy:
   ```bash
   vercel
   ```
   When it's ready, push it live to your production domain:
   ```bash
   vercel --prod
   ```

**Option B — connect the GitHub repo in the Vercel dashboard:**

1. In Vercel, **Add New → Project** and import the `questday` repo.
2. Under **Settings → General → Root Directory**, set it to `website`.
   (This is required because the Next.js app is not at the repo root.)
3. Framework preset auto-detects **Next.js**; keep the default build command
   (`next build`) and output settings. Deploy.

Either way, Vercel builds with `npm install` + `npm run build` automatically —
no environment variables are needed (the site has no secrets or backend).
