# Quest Library v1 — "Common to-do list" (design spec)

_Date: 2026-06-17 · Branch: `feature/civilization-world-map` · Status: **design approved, awaiting spec review**_

## 1. Summary

The **Quest Library** is a set of saved, reusable quest **templates** that the user taps or
drags to drop into today. It is the **manual** counterpart to recurrence: recurrence
auto-spawns quests on a schedule; the Library is "add this when I want it." It directly serves
the user's stated use case — a repeatable **work-day** kit and a **gym-day** kit they re-add
often without retyping.

A template is a quest **blueprint**: it stores the reusable parts of a quest and omits the
day-specific "instance" parts (due date, time frame, status, rewards). Tapping or dragging a
template **creates a real quest** from that blueprint.

## 2. Scope

**In scope (v1):**
- A **Library side rail** living inside the **Quests** tab (left column; collapsible).
- **Create** a template from scratch in the rail.
- **Save as template** — an action on any existing quest that copies its blueprint into the Library.
- **Add to today — two ways (hybrid):**
  - **Tap** a template card → opens the New Quest form **pre-filled** from the template; the user
    picks a time frame + due date → Save creates the quest.
  - **Drag** a template card onto a time-frame card → **instantly** creates the quest in that frame
    (no due date until edited).
- **Edit** a template's fields.
- **Delete** a template (removes the blueprint only; never touches quests already created from it).
- **Collapse/expand** the rail; **feature toggle** to hide it entirely (data kept, never deleted).

**Out of scope (deferred):**
- **Bundles / day-kits** (one tap drops a whole set of quests) → **phase 2**.
- **Morning prompt** ("add your usual work-day kit?") → **phase 3**.
- Templates carrying **recurrence** (see §10). Sharing/import/export of templates. Reordering
  templates by hand. Folders/tags/search.

## 3. The look (approved)

Approved layout = **Variant B "Side rail"** (`mockups/quest-library-b.html`). The Quests tab
becomes a two-column layout: a ~308px **Library rail on the left** (its own header with a
collapse chevron + "+ New template", then template cards stacked vertically), and the existing
**time-frame cards on the right** as the drag targets. Collapsing the rail shrinks it to a thin
(~46px) vertical strip with a rotated "Library" label and an expand chevron, returning full
width to the quest list. Styling follows `src/renderer/theme.css` tokens (dark emerald-ink,
claymorphism, emerald primary + gold XP) so the rail reads as native QuestDay.

Each **template card** shows: title; "N steps" (sub-task count); the **Importance / Urgency /
Difficulty** badges (same colors as live quest rows); the time estimate; a primary
**"+ Add to today"** button (the tap flow); and a **drag grip** with a "drag onto a time frame"
hint (the drag flow).

## 4. Data model

A template is a `Quest` **minus its instance fields**. New shared type:

```ts
// src/shared/types.ts
export interface QuestTemplate {
  id: string                 // uid()
  title: string
  subTasks: SubTask[]        // reused SubTask shape; their `done` is reset/false in a template
  difficulty: Difficulty
  importance: Importance
  urgency: Urgency
  timeEstimateMinutes: number
  createdAt: string          // ISO; used for default sort (newest first)
}
```

**Stored:** `title, subTasks, difficulty, importance, urgency, timeEstimateMinutes` (+ a fresh
template `id`, `createdAt`). **Dropped** (these belong to a live quest instance, not a blueprint —
including the source quest's own `id`/`createdAt`): `dueAt`, `timeFrameId`, `status`,
`completedAt`, `completionAward`, `sortOrder`, `rolledOverCount`, `completionDates`, `recurDays`.

**Sub-task handling:** the real `SubTask` (`src/shared/types.ts`) carries `id`, `title`, `done`,
`order`, and `timeEstimateMinutes`. In a template each sub-task's `done` is forced **`false`**;
`order`/`timeEstimateMinutes` are preserved. When a template later becomes a quest, its sub-tasks
are mapped to the `QuestInput` sub-task **input shape** (`{ title, timeEstimateMinutes? }[]`) and
`createQuest`'s `buildSubTasks` regenerates fresh `id`/`order`/`done:false`.

## 5. Storage & safety  ⚠️ schema change = STOP-AND-CONFIRM

- **New top-level db key** `questTemplates: QuestTemplate[]`. Adding it is a **schema change** and
  therefore a **stop-and-confirm** action: explicit user yes before the code that introduces it
  is written (same gate as `townLayouts`).
- **Wholesale-replace on save** (like `townLayouts`, NOT deep-merged like `settings`/`player`).
  The save path already replaces all top-level keys except `settings`/`player` wholesale, so no
  change to the deep-merge/validate logic is needed beyond adding `questTemplates` validation.
- **Gains-only:** templates are never lost to a missed day; there is no decay.
- **Never read by `civilization.ts` / `realm.ts` / rewards.** Civilization unlocks remain a pure
  function of all-time **completions**; templates only ever produce ordinary quests via the
  normal `createQuest` path, each of which stores its own exact `completionAward`. Therefore
  **↩ Restore stays exact** and the reward world is untouched.
- **Defaults & migration:** `createDefaultDatabase` seeds `questTemplates: []`; the `store.ts`
  migration stays tolerant of older saves missing the key
  (`questTemplates: db.questTemplates ?? fresh.questTemplates`, the same `??`/`...fresh ... ...db`
  pattern used for `townLayouts`/`lastSeenDate`). `validate()` guards the new array **consistently
  with the existing `townLayouts` guard** — i.e. if `questTemplates` is malformed it **rejects the
  whole save with a reason string** (it does NOT silently drop entries; that matches how
  `validate()` already behaves in `store.ts`).

## 6. Feature toggle  (path DECIDED — resolves the audit's main fork)

The existing toggle system is **tab-coupled**: `TOGGLEABLE_FEATURES` in `features.ts` lists
optional features, `App.tsx` hides any *tab* whose id is a disabled feature, and `DataView`
auto-renders a toggle row per `TOGGLEABLE_FEATURES` entry. The Library is a **sub-section, not a
tab**, so we adapt as follows (chosen over a bespoke switch, because it gets the Data-tab toggle
for free and is the smallest change):

- **Add one `questLibrary` entry to `TOGGLEABLE_FEATURES`.** This auto-renders its on/off toggle in
  the **Data tab** alongside the others. Because no *tab* has the id `questLibrary`, the `App.tsx`
  tab-filter simply never matches it — **no tab is shown or hidden**, so this is behaviorally safe.
- **`QuestsView` reads `isFeatureEnabled(db, 'questLibrary')`** to decide whether to render the rail.
  Off → rail hidden, Quests tab returns to its single-column layout; **template data is kept on
  disk, never deleted** (tone rule).
- **Do NOT seed `questLibrary` in `defaults.ts` `enabledFeatures`.** The convention is
  *missing key = ON* (e.g. `world` is not seeded yet defaults on), so omitting it gives the
  desired **default-ON** without a migration.
- **Loosen the `features.ts` doc invariant:** update its comment so a toggleable feature is
  understood as "a tab **or** an optional sub-section," and `ToggleableFeature.id`'s "must match a
  tab id" note becomes "matches a tab id **or** a sub-section flag read directly via
  `isFeatureEnabled`." (Comment/doc change only — no behavior change to `isCoreTab`.)

## 7. Components

- **`QuestLibraryRail.tsx`** — the left rail rendered inside `QuestsView`. Owns collapse state,
  renders the header (collapse chevron + "+ New template"), the list of `TemplateCard`s, and the
  empty state. Talks to the store via new actions (§8).
- **`TemplateCard.tsx`** — one template: title, step count, badges, time estimate, "+ Add to
  today" button, drag grip. `draggable`; sets a **template-specific** drag payload (§9).
- **Template form** — reuse `QuestForm` with a new `hideScheduling` (or `mode="template"`) prop
  that hides **three** instance-only fields: **due date**, **time frame**, AND **"Repeats"
  (recurrence)** — templates carry no recurrence (§10), and `QuestForm` renders a Repeats field
  today, so it must be hidden too. Used for both **create new template** and **edit template**.
  **Adaptation needed:** `QuestForm`'s `initial` prop is typed `Quest | null`, but a
  `QuestTemplate` is **not** a `Quest`. Widen `initial` to accept template data (e.g.
  `Quest | QuestTemplate | null`, or a small `QuestFormInitial` partial), OR build a synthetic
  `Quest`-shaped object from the template before passing it in. The same adaptation powers the
  **tap-prefill** flow (§9.3), which pre-fills the form from a template. This keeps a single
  field-editor instead of a parallel form.
- **`QuestsView.tsx`** — becomes the two-column host (rail + frames); time-frame cards gain a
  drop handler branch for template drops (§9); quest rows gain a "Save as template" ghost action.

## 8. Store actions (renderer `state/store.ts`)

- `createTemplate(input)` — build a `QuestTemplate` (uid, createdAt=now, subTasks with `done:false`)
  and append; save `{ questTemplates }` wholesale.
- `updateTemplate(id, input)` — replace fields of one template; save wholesale.
- `deleteTemplate(id)` — remove one template; save wholesale.
- `saveQuestAsTemplate(questId)` — read the quest, strip instance fields, and map its `subTasks`
  to `{ ...s, done: false }`, append as a template.
- **Tap-add** is a renderer flow, not a store action: open `QuestForm` pre-filled from the
  template (default time frame = active frame) → on Save call existing `createQuest`.
- **Drag-add** calls existing `createQuest` with a **complete, valid `QuestInput`** built from the
  blueprint: `{ title, difficulty, importance, urgency, timeEstimateMinutes,
  subTasks: <input-shape>, timeFrameId: <dropped frame>, dueAt: null, recurDays: [] }`.
  Note `dueAt` is **`null`** (not `undefined` — `QuestInput.dueAt` is `string | null`), and the
  sub-tasks are passed in the input shape so `createQuest`'s `buildSubTasks` regenerates them.

No new IPC channel is required — all of the above route through the existing
`store.saveState(patch)` path. `createQuest` is reused unchanged.

## 9. Data flow / interactions

1. **Create new template:** rail "+ New template" → template form (no due/frame) → Save →
   `createTemplate` → card appears in the rail.
2. **Save as template:** quest row "Save as template" ghost action → `saveQuestAsTemplate` →
   card appears in the rail. (No duplicate-detection in v1; saving twice makes two templates.)
3. **Tap → add to today:** card "+ Add to today" → `QuestForm` opens pre-filled (title, subtasks,
   difficulty, importance, urgency, time estimate), time frame defaulted to the active frame,
   due date empty → user adjusts → Save → `createQuest` → quest appears in the chosen frame.
4. **Drag → add to today:** drag a `TemplateCard` onto a time-frame card → `createQuest` in that
   frame with no due date → quest appears immediately.
5. **Edit template:** card → Edit → template form → `updateTemplate`.
6. **Delete template:** card → Delete → `deleteTemplate` (immediate, matching `deleteQuest`; this
   is a low-stakes blueprint, not a quest).
7. **Collapse/expand & toggle:** local UI state for collapse; `enabledFeatures.questLibrary` for
   the show/hide toggle.

**Drag-and-drop coexistence (important):** live quests already use the `text/plain` dataTransfer
key (= quest id) for reorder/move. Templates must use a **distinct** key, e.g.
`application/x-questday-template` carrying the template id. A time frame's `onDrop` first checks
for the template key (→ `createQuest`); only if absent does it fall back to the existing quest-move
behavior. **Caveat:** the existing frame/row `onDrop` handlers read
`getData('text/plain') || dragId`, where `dragId` is internal React state set only when a *quest*
drag starts. The template-key check must run **before** that `|| dragId` fallback, and a template
drag must **not** set `dragId` — so a template drop can never be mis-read as a quest move. This
guarantees the new drag source cannot corrupt the existing reorder/move logic.

## 10. Minor decisions (settled)

- **No recurrence on templates.** Recurrence is the automatic-scheduler system; the Library is the
  manual one. Mixing them would create two overlapping ways to "make this repeat." A template
  produces a one-off quest; if the user wants it recurring, they set recurrence on the created
  quest. (Revisitable later, but explicitly out of v1.)
- **Sort:** newest-created first (`createdAt` descending). Simple; manual reordering deferred.
- **Empty state:** a friendly card in the rail explaining you can **save any quest as a template**
  or **build one from scratch** — never a punishing/empty-shaming message (tone rule).

## 11. Error handling / edge cases

- **Empty/invalid template:** the reused `QuestForm` validation applies (e.g. title required); no
  template is created on invalid input.
- **Adding a template when no time frames exist:** the tap flow's form still opens; if there are no
  frames, the existing `QuestForm` empty-frame behavior governs (no special-casing in v1). Drag-add
  is impossible without a frame to drop on — acceptable.
- **Deleting a template that was already used:** harmless — created quests are independent copies.
- **Toggle off with templates present:** rail hidden, `questTemplates` retained on disk.
- **Restore exactness:** unaffected — templates are never an input to reward/civilization math.

## 12. Testing & acceptance

- **Typecheck:** `npm run typecheck` clean (main + renderer).
- **New Playwright driver** `scripts/pw-library.mjs` (isolated `--user-data-dir`, drives built
  `out/`), covering: create template; save-as-template; tap-add creates a quest in the chosen
  frame with the right fields; drag-add creates a quest in the dropped frame; edit template;
  delete template; collapse/expand; toggle off hides the rail while data persists.
- **Regression:** `npm run pw:rewards` still passes (↩ Restore exact) — proves the reward path is
  untouched.
- **Acceptance check (real terms):** "A user can save their gym-day quest as a template, then on
  any later day **tap** it (pick a frame, Save) **or drag** it onto a frame to recreate that quest,
  the new quest behaves like any normal quest, and completing/restoring it awards/returns the exact
  same XP as before the Library existed."

## 13. Stop-and-confirm items (explicit yes required, per CLAUDE.md)

- Introducing the **`questTemplates`** top-level db key (schema change) — including the
  `defaults.ts` seed, `store.ts` migration tolerance, and `validate()` guard.
- Any change to the save **deep-merge/validate** logic (expected: none needed beyond adding the
  validation guard — confirm before touching it).
- (Standard:) no new npm dependencies; no preload/IPC/sandbox/security changes (none expected);
  no `npm run dist`/publish; no `git push`.

## 14. Build order (preview — full plan comes from writing-plans)

1. Types + defaults + migration + validate guard for `questTemplates` **(schema gate)**.
2. Store actions (`createTemplate`/`updateTemplate`/`deleteTemplate`/`saveQuestAsTemplate`).
3. `QuestForm` `hideScheduling` prop; `TemplateCard`; `QuestLibraryRail`; wire into `QuestsView`
   (two-column + collapse + toggle).
4. The two add-to-today flows (tap pre-fill + drag-drop with the distinct payload key).
5. "Save as template" action on quest rows; empty state.
6. `features.ts` + `enabledFeatures.questLibrary` toggle.
7. `pw-library.mjs` driver + rewards regression; typecheck.

Each step: plan → user OK → build → test steps → user confirms → next. The schema step (1) stops
for explicit yes before any code is written.
