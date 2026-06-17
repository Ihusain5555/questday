# Quest Library v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Quest Library" — saved reusable quest *templates* the user taps or drags to drop into today — as a collapsible side rail inside the Quests tab.

**Architecture:** A template is a `Quest` minus its instance fields, stored in a new top-level db key `questTemplates: QuestTemplate[]` (wholesale-replace, gains-only, **never read by civilization/rewards** so ↩ Restore stays exact). Templates produce ordinary quests through the existing `createQuest` path. The rail reuses `QuestForm` (with a new `hideScheduling` prop), `createQuest`, and the feature-toggle system.

**Tech Stack:** Electron + React + TypeScript (electron-vite); local JSON store; Zustand renderer store; Phosphor icons; theme.css tokens. No new dependencies. Verification = `npm run typecheck` + Playwright drivers against built `out/` (QuestDay has no unit tests).

---

## How to execute this plan (gates — load-bearing, from CLAUDE.md)

- **One feature at a time.** For each Task: present the plan → get the user's explicit **OK** → build → give beginner test steps → user tests & confirms → next Task. "Continue" does not auto-advance to the next Task.
- **Task 1 is a STOP-AND-CONFIRM schema change.** Get an explicit yes *for that specific action* before writing any of its code.
- **Commits are user-gated.** The user commits only when they ask. Each Task lists a suggested commit; do it only on the user's say-so. No `git push`.
- **No new npm dependencies. No preload/IPC/sandbox/security changes** (none are needed). No `npm run dist`.
- **Verification per Task:** `npm run typecheck` (main + renderer) must be clean; the build (`npm run build`) must succeed before any Playwright run; visual tasks also require the **user to see it in the real app and accept the look**.
- **Definition of done (whole feature):** typecheck clean + `scripts/pw-library.mjs` passes + `npm run pw:rewards` still passes (↩ Restore exact) + the acceptance check in Task 8 is met.

---

## File Structure

**New files:**
- `src/renderer/app/QuestLibraryRail.tsx` — the left rail inside `QuestsView`; owns collapse state, header, the template list, and the empty state. Reads `db.questTemplates` and the template store actions.
- `src/renderer/app/TemplateCard.tsx` — one template card: title, step count, badges, time estimate, "+ Add to today" button, drag grip. `draggable`; sets the template drag payload.
- `scripts/pw-library.mjs` — Playwright driver (isolated `--user-data-dir`, drives built `out/`).

**Modified files:**
- `src/shared/types.ts` — add `QuestTemplate` interface; add `questTemplates` to the `Database` interface.
- `src/shared/defaults.ts` — seed `questTemplates: []` in `createDefaultDatabase`.
- `src/main/db/store.ts` — `migrate()` tolerance + `validate()` guard for `questTemplates`.
- `src/renderer/state/store.ts` — `QuestInput` is here already; add 4 template actions + their `AppStore` signatures; ensure `DatabasePatch` allows `questTemplates`.
- `src/renderer/app/QuestForm.tsx` — add `hideScheduling?: boolean` prop + widen `initial` to `QuestFormInitial | null`; conditionally hide due / time-frame / Repeats fields.
- `src/renderer/app/QuestsView.tsx` — two-column layout (mount the rail), feature-gate read, template drag-drop branch, "Save as template" quest-row action.
- `src/renderer/app/features.ts` — add the `questLibrary` `TOGGLEABLE_FEATURES` entry.
- `src/renderer/app/DataView.tsx` — ensure the chosen Phosphor icon is in its icon-name → component map (verify; add if missing).
- `src/renderer/styles.css` — rail + card styles (port the approved look from `mockups/quest-library-b.html`, mapped to theme.css tokens).

---

## Task 1: `questTemplates` schema  ⚠️ STOP-AND-CONFIRM — explicit yes before ANY code here

**Files:**
- Modify: `src/shared/types.ts` (add `QuestTemplate`; add `questTemplates` to `Database`)
- Modify: `src/shared/defaults.ts` (seed `questTemplates: []`)
- Modify: `src/main/db/store.ts` (`migrate()` + `validate()`)

- [ ] **Step 0: Get explicit user confirmation for the schema change.** State: "Task 1 introduces a new top-level save-file key `questTemplates`. Blast radius: the `db.json` schema, `defaults.ts`, `migrate()`, and `validate()`. It is additive and reversible (the key defaults to `[]`, old saves migrate cleanly). May I proceed?" Wait for an explicit yes.

- [ ] **Step 1: Add the `QuestTemplate` interface to `src/shared/types.ts`.** Place it directly after the `Quest` interface. It reuses the existing `SubTask`, `Difficulty`, `Importance`, `Urgency` types already in this file:

```ts
/** A reusable quest blueprint (Quest Library v1). It stores ONLY the reusable
 *  parts of a quest; the day-specific instance fields (dueAt, timeFrameId,
 *  status, rewards, recurrence…) are intentionally omitted — they're filled in
 *  when a template is turned into a real quest via createQuest. Gains-only,
 *  wholesale-replaced on save, and NEVER read by civilization.ts/realm.ts/rewards,
 *  so ↩ Restore stays exact. */
export interface QuestTemplate {
  id: string
  title: string
  subTasks: SubTask[] // each sub-task's `done` is always false in a template
  difficulty: Difficulty
  importance: Importance
  urgency: Urgency
  timeEstimateMinutes: number
  createdAt: string // ISO; default sort is newest-first
}
```

- [ ] **Step 2: Add `questTemplates` to the `Database` interface in `src/shared/types.ts`.** Find the `Database` interface (it has `version`, `quests`, `timeFrames`, `player`, `garden`, `arcade`, `settings`, `townLayouts`, `lastSeenDate`). Add this field next to `townLayouts`:

```ts
  /** Quest Library: saved reusable quest blueprints (v1). Wholesale-replaced on
   *  save like townLayouts; never read by reward/civilization math. */
  questTemplates: QuestTemplate[]
```

- [ ] **Step 3: Seed the default in `src/shared/defaults.ts`.** In `createDefaultDatabase`'s returned object, add `questTemplates: []` next to `townLayouts: {}` (around line 60). Do **NOT** add `questLibrary` to `enabledFeatures` — missing key already means ON (`isFeatureEnabled` returns `enabled?.[id] !== false`), matching how `world` defaults on.

```ts
    townLayouts: {},
    questTemplates: [],
    lastSeenDate: null
  }
```

- [ ] **Step 4: Add migration tolerance in `src/main/db/store.ts` `migrate()`.** Mirror the `townLayouts` pattern (accept a valid array, else fall back to the fresh empty array). Add this entry to the returned object next to `townLayouts`:

```ts
    // Quest Library: tolerate old saves (missing) and corruption (non-array) by
    // failing safe to []. Per-entry validation happens on the WRITE path (validate()).
    questTemplates: Array.isArray(db.questTemplates) ? db.questTemplates : fresh.questTemplates,
```

- [ ] **Step 5: Add the `validate()` guard in `src/main/db/store.ts`.** Mirror the `townLayouts` guard — reject the **whole save** with a reason string on malformed data (do NOT silently drop entries). Insert before `return null` at the end of `validate()`:

```ts
  // questTemplates is optional-shaped on disk; if present it must be an array of
  // blueprint objects with the required fields. Reject anything malformed so a
  // renderer bug can't persist a corrupt library (the reward engine never reads
  // it, but the save must stay structurally sound). Checked as `unknown`.
  const templates = db.questTemplates as unknown
  if (templates != null) {
    if (!Array.isArray(templates)) return 'questTemplates must be an array'
    for (const t of templates as unknown[]) {
      const tpl = t as Partial<QuestTemplate> | null
      if (!tpl || typeof tpl !== 'object') return 'questTemplates entries must be objects'
      if (typeof tpl.id !== 'string') return 'questTemplates entry needs a string id'
      if (typeof tpl.title !== 'string') return 'questTemplates entry needs a string title'
      if (!Array.isArray(tpl.subTasks)) return 'questTemplates entry needs a subTasks array'
    }
  }
```

  - Add `QuestTemplate` to the existing `import { … } from '...types'` line at the top of `store.ts` if it isn't already imported.

- [ ] **Step 6: Typecheck.**

Run: `npm run typecheck`
Expected: clean (main + renderer), no errors.

- [ ] **Step 7: Build + launch sanity check (user test steps).**

Run: `npm run build`
Then have the user open the app normally and add/complete a quest.
Expected: app launches and behaves exactly as before (the new key is invisible). After a save, `%APPDATA%\questday\db.json` contains `"questTemplates": []`. ↩ Restore on a completed quest still returns the exact XP.

- [ ] **Step 8: Commit (with the user's OK).**

```bash
git add src/shared/types.ts src/shared/defaults.ts src/main/db/store.ts
git commit -m "feat(quest-library): add questTemplates db key (schema)"
```

---

## Task 2: Template store actions

**Files:**
- Modify: `src/renderer/state/store.ts` (4 actions + their `AppStore` signatures)

- [ ] **Step 1: Add the action signatures to the `AppStore` interface.** Add a new section after the `// ---- Quests ----` block:

```ts
  // ---- Quest Library (templates, v1) ----
  /** Build a blueprint from form input and append it. */
  createTemplate: (input: QuestInput) => Promise<void>
  /** Replace a template's reusable fields. */
  updateTemplate: (id: string, input: QuestInput) => Promise<void>
  /** Remove a template (created quests are independent — never touched). */
  deleteTemplate: (id: string) => Promise<void>
  /** Copy an existing quest's blueprint into the Library. */
  saveQuestAsTemplate: (questId: string) => Promise<void>
```

- [ ] **Step 2: Confirm `DatabasePatch` allows `questTemplates`.** If `DatabasePatch` is `Partial<Database>`, no change is needed (the field added in Task 1 is picked up automatically). If it is a hand-written type, add `questTemplates?: QuestTemplate[]` to it. Ensure `QuestTemplate` is imported into `store.ts` from the shared types.

- [ ] **Step 3: Implement the four actions.** Add them to the store object next to `deleteQuest`. They follow the exact `createQuest`/`deleteQuest`/`save()` patterns already in this file (`buildSubTasks` is the existing helper that resets `done:false` and re-indexes `order`):

```ts
  createTemplate: async (input) => {
    const db = get().db
    if (!db) return
    const template: QuestTemplate = {
      id: uid(),
      title: input.title.trim(),
      subTasks: buildSubTasks(input.subTasks),
      difficulty: input.difficulty,
      importance: input.importance,
      urgency: input.urgency,
      timeEstimateMinutes: Math.max(0, Math.round(input.timeEstimateMinutes)),
      createdAt: new Date().toISOString()
    }
    await get().save({ questTemplates: [...db.questTemplates, template] })
  },

  updateTemplate: async (id, input) => {
    const db = get().db
    if (!db) return
    const questTemplates = db.questTemplates.map((t) =>
      t.id === id
        ? {
            ...t,
            title: input.title.trim(),
            subTasks: buildSubTasks(input.subTasks),
            difficulty: input.difficulty,
            importance: input.importance,
            urgency: input.urgency,
            timeEstimateMinutes: Math.max(0, Math.round(input.timeEstimateMinutes))
          }
        : t
    )
    await get().save({ questTemplates })
  },

  deleteTemplate: async (id) => {
    const db = get().db
    if (!db) return
    await get().save({ questTemplates: db.questTemplates.filter((t) => t.id !== id) })
  },

  saveQuestAsTemplate: async (questId) => {
    const db = get().db
    if (!db) return
    const q = db.quests.find((x) => x.id === questId)
    if (!q) return
    const template: QuestTemplate = {
      id: uid(),
      title: q.title,
      // Strip instance state: regenerate sub-task ids/order, force done:false.
      subTasks: q.subTasks.map((s, i) => ({
        id: uid(),
        title: s.title,
        order: i,
        done: false,
        timeEstimateMinutes: s.timeEstimateMinutes
      })),
      difficulty: q.difficulty,
      importance: q.importance,
      urgency: q.urgency,
      timeEstimateMinutes: q.timeEstimateMinutes,
      createdAt: new Date().toISOString()
    }
    await get().save({ questTemplates: [...db.questTemplates, template] })
  },
```

- [ ] **Step 4: Typecheck.**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit (with the user's OK).**

```bash
git add src/renderer/state/store.ts
git commit -m "feat(quest-library): template store actions"
```

---

## Task 3: `QuestForm` template mode (`hideScheduling`)

**Files:**
- Modify: `src/renderer/app/QuestForm.tsx`

- [ ] **Step 1: Widen the `initial` prop and add `hideScheduling`.** Define a `QuestFormInitial` type (so a `QuestTemplate`, which lacks `dueAt`/`timeFrameId`/`recurDays`, is assignable while a `Quest` still is). Add it above `Props` and update `Props`:

```ts
import type { Quest, QuestTemplate, SubTask, TimeFrame, Difficulty, Importance, Urgency } from '../../shared/types'

/** What QuestForm needs to pre-fill. A Quest satisfies this; so does a
 *  QuestTemplate (scheduling fields are optional and ignored in template mode). */
export type QuestFormInitial =
  | (Pick<Quest, 'title' | 'difficulty' | 'importance' | 'urgency' | 'timeEstimateMinutes' | 'subTasks'> &
      Partial<Pick<Quest, 'dueAt' | 'timeFrameId' | 'recurDays'>>)

interface Props {
  timeFrames: TimeFrame[]
  initial: QuestFormInitial | null
  defaultTimeFrameId: string
  onSave: (input: QuestInput) => void
  onCancel: () => void
  /** Template mode: hide due-date, time-frame, and Repeats; the emitted QuestInput
   *  gets dueAt:null, timeFrameId:defaultTimeFrameId, recurDays:[] so the type holds
   *  but callers (createTemplate/updateTemplate) ignore those fields. */
  hideScheduling?: boolean
}
```

  - Adjust the import to match the file's existing import style; only add `QuestTemplate` if you reference it (the `Pick` approach above does not require importing `QuestTemplate`).

- [ ] **Step 2: Accept the prop in the component signature.**

```ts
export function QuestForm({
  timeFrames,
  initial,
  defaultTimeFrameId,
  onSave,
  onCancel,
  hideScheduling = false
}: Props): JSX.Element {
```

- [ ] **Step 3: Hide the three scheduling fields.** Wrap each block in `{!hideScheduling && ( … )}`:
  - The **Due date** `<label className="field">` (currently ~lines 176-179).
  - The **Time frame** `<label className="field">` (currently ~lines 180-189).
  - The **Repeats** `<div className="field">…</div>` recurrence block (currently ~lines 192-225).

- [ ] **Step 4: Force instance fields in `submit()` when in template mode.** Replace the three scheduling values in the `onSave({...})` call so the emitted `QuestInput` is always valid:

```ts
    onSave({
      title,
      difficulty,
      importance,
      urgency,
      timeEstimateMinutes: Math.max(0, (Number(estHours) || 0) * 60 + (Number(estMinutes) || 0)),
      dueAt: hideScheduling ? null : localInputToIso(dueLocal),
      timeFrameId: hideScheduling ? (defaultTimeFrameId ?? timeFrames[0]?.id ?? '') : timeFrameId,
      subTasks: subs.map((s) => ({
        id: s.id,
        title: s.title,
        timeEstimateMinutes: Number(s.estimate) > 0 ? Math.round(Number(s.estimate)) : undefined
      })),
      recurDays: hideScheduling ? [] : recurDays
    })
```

- [ ] **Step 5: Typecheck.**

Run: `npm run typecheck`
Expected: clean. The existing edit-quest call site (passes a `Quest`) still satisfies `QuestFormInitial`.

- [ ] **Step 6: Regression test steps (user).**

Run: `npm run build`, open the app, create a new quest and edit an existing quest.
Expected: the normal New/Edit Quest form is unchanged (due date, time frame, and Repeats all still appear and work). `hideScheduling` is not used by any caller yet, so behavior is identical.

- [ ] **Step 7: Commit (with the user's OK).**

```bash
git add src/renderer/app/QuestForm.tsx
git commit -m "feat(quest-library): QuestForm hideScheduling (template) mode"
```

---

## Task 4: `TemplateCard` and `QuestLibraryRail` components (+ styles)

**Files:**
- Create: `src/renderer/app/TemplateCard.tsx`
- Create: `src/renderer/app/QuestLibraryRail.tsx`
- Modify: `src/renderer/styles.css`

> **Visual source of truth:** the approved look is `mockups/quest-library-b.html` (Variant B "Side rail"). Port its rail + card structure and CSS, mapping every color to a `theme.css` token (`var(--brand)`, `var(--xp)`, claymorphism surfaces) — never raw hex. The component markup below defines the structure and the className contract; the CSS step fills in the visual values from the mockup.

- [ ] **Step 1: Create `TemplateCard.tsx`.** It is presentational + sets the drag payload. The drag MIME key is **distinct** (`application/x-questday-template`) and the card must **NOT** touch `QuestsView`'s `dragId` state:

```tsx
import type { QuestTemplate } from '../../shared/types'
import { DotsSixVertical, Plus } from '@phosphor-icons/react'

export const TEMPLATE_DRAG_MIME = 'application/x-questday-template'

interface Props {
  template: QuestTemplate
  onAdd: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TemplateCard({ template: t, onAdd, onEdit, onDelete }: Props): JSX.Element {
  return (
    <div
      className="template-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TEMPLATE_DRAG_MIME, t.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <div className="template-card-grip" title="Drag onto a time frame to add it">
        <DotsSixVertical size={16} weight="bold" />
      </div>
      <div className="template-card-body">
        <div className="template-card-title">{t.title}</div>
        <div className="template-card-meta">
          <span>{t.subTasks.length} steps</span>
          <span>·</span>
          <span>{t.timeEstimateMinutes} min</span>
        </div>
        <div className="template-card-badges">
          <span className={`badge imp-${t.importance.toLowerCase()}`}>{t.importance}</span>
          <span className={`badge urg-${t.urgency.toLowerCase()}`}>{t.urgency}</span>
          <span className={`badge diff-${t.difficulty.toLowerCase()}`}>{t.difficulty}</span>
        </div>
        <div className="template-card-actions">
          <button className="primary sm" onClick={onAdd}>
            <Plus size={13} weight="bold" /> Add to today
          </button>
          <button className="ghost sm" onClick={onEdit}>Edit</button>
          <button className="ghost sm danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}
```

  - **Badge classNames:** reuse whatever class the live quest rows use for Importance/Urgency/Difficulty badges so colors match (inspect `QuestsView.tsx` quest-row badges and copy the exact class scheme; adjust the markup above to match rather than inventing `imp-*`/`urg-*` if the codebase already has badge classes).

- [ ] **Step 2: Create `QuestLibraryRail.tsx`.** It owns collapse state, renders the header, the list, and the empty state. The form open/close + add-to-today flows are wired in Task 5/6 — for now accept callbacks as props so this file stays focused:

```tsx
import { useState } from 'react'
import type { QuestTemplate } from '../../shared/types'
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import { TemplateCard } from './TemplateCard'

interface Props {
  templates: QuestTemplate[]
  onNewTemplate: () => void
  onAddToToday: (t: QuestTemplate) => void
  onEditTemplate: (t: QuestTemplate) => void
  onDeleteTemplate: (t: QuestTemplate) => void
}

export function QuestLibraryRail({
  templates,
  onNewTemplate,
  onAddToToday,
  onEditTemplate,
  onDeleteTemplate
}: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  // Newest first (spec §10).
  const sorted = [...templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (collapsed) {
    return (
      <div className="library-rail collapsed">
        <button className="rail-expand" onClick={() => setCollapsed(false)} title="Expand Library">
          <CaretRight size={16} weight="bold" />
        </button>
        <span className="rail-label-vertical">Library</span>
      </div>
    )
  }

  return (
    <div className="library-rail">
      <div className="rail-head">
        <button className="rail-collapse" onClick={() => setCollapsed(true)} title="Collapse Library">
          <CaretLeft size={16} weight="bold" />
        </button>
        <h3>Library</h3>
        <button className="ghost sm" onClick={onNewTemplate}>
          <Plus size={13} weight="bold" /> New template
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rail-empty">
          <p>No saved templates yet.</p>
          <p className="meta-dim">
            Build one with <strong>+ New template</strong>, or use <strong>Save as template</strong> on
            any quest to reuse it later.
          </p>
        </div>
      ) : (
        <div className="rail-list">
          {sorted.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onAdd={() => onAddToToday(t)}
              onEdit={() => onEditTemplate(t)}
              onDelete={() => onDeleteTemplate(t)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add rail + card CSS to `styles.css`.** Port from `mockups/quest-library-b.html`. Required rules (fill values from the mockup, using theme tokens):
  - `.quests-layout` — the two-column flex/grid host (rail left ~308px, frames flex-1).
  - `.library-rail` (expanded) and `.library-rail.collapsed` (~46px thin strip) + `.rail-label-vertical` (rotated text) + `.rail-expand`/`.rail-collapse`.
  - `.rail-head`, `.rail-list`, `.rail-empty`.
  - `.template-card`, `.template-card-grip` (drag affordance), `.template-card-title`, `.template-card-meta`, `.template-card-badges`, `.template-card-actions`.
  - `.sm` button size modifier if not already present.

- [ ] **Step 4: Typecheck.**

Run: `npm run typecheck`
Expected: clean (these components are not mounted yet, but must compile).

- [ ] **Step 5: Commit (with the user's OK).**

```bash
git add src/renderer/app/TemplateCard.tsx src/renderer/app/QuestLibraryRail.tsx src/renderer/styles.css
git commit -m "feat(quest-library): TemplateCard + QuestLibraryRail components + styles"
```

---

## Task 5: Wire the rail into `QuestsView` + feature toggle

**Files:**
- Modify: `src/renderer/app/QuestsView.tsx`
- Modify: `src/renderer/app/features.ts`
- Modify: `src/renderer/app/DataView.tsx` (icon-map check)

- [ ] **Step 1: Add the `questLibrary` toggle entry to `features.ts`.** Append to `TOGGLEABLE_FEATURES`. Because no *tab* has the id `questLibrary`, `App.tsx`'s tab filter never matches it, so no tab is shown/hidden — only the Data-tab toggle row appears:

```ts
  ,{
    // A sub-section, not a tab: the Library rail lives inside the Quests tab.
    // Toggle hides the rail only — saved templates are kept on disk (gains-only).
    id: 'questLibrary',
    icon: 'Books',
    label: 'Quest Library',
    blurb: 'Save reusable quest templates (your work-day / gym-day things) and tap or drag them into today.'
  }
```

  - Also loosen the doc comment on `ToggleableFeature.id` from "Must match the tab id in App.tsx." to "Matches a tab id, **or** a sub-section flag read directly via `isFeatureEnabled`." (comment-only).

- [ ] **Step 2: Ensure the `Books` icon resolves in `DataView.tsx`.** `DataView` maps the `icon` string to a Phosphor component. Open `DataView.tsx`, find that map, and confirm `Books` is present; if not, import `Books` from `@phosphor-icons/react` and add it to the map. (If you prefer a different fitting icon, use one already in the map to skip this step.)

- [ ] **Step 3: Mount the rail in `QuestsView`, gated by the toggle.** Import the rail, `isFeatureEnabled`, and the template actions; wrap the existing content in the two-column layout. The rail renders only when the feature is on:

```tsx
import { QuestLibraryRail } from './QuestLibraryRail'
import { isFeatureEnabled } from './features'
// ...inside the component:
const { db, createQuest, deleteQuest, /* …existing… */
        createTemplate, updateTemplate, deleteTemplate, saveQuestAsTemplate } = useStore()
const libraryOn = isFeatureEnabled(db?.settings.enabledFeatures, 'questLibrary')
```

  Then change the top-level return so the rail sits left of the frames (keep the existing `view-head` + frames markup intact inside `.quests-main`):

```tsx
  return (
    <div className="quests-layout">
      {libraryOn && (
        <QuestLibraryRail
          templates={db?.questTemplates ?? []}
          onNewTemplate={openNewTemplate}
          onAddToToday={openTapAdd}
          onEditTemplate={openEditTemplate}
          onDeleteTemplate={(t) => void deleteTemplate(t.id)}
        />
      )}
      <div className="quests-main">
        {/* existing <div className="view-head">…</div> and frames.map(...) go here */}
      </div>
    </div>
  )
```

  - `openNewTemplate`, `openTapAdd`, `openEditTemplate` are added in Task 6. For this task, stub them as `() => {}` (or a `console.log`) so the file compiles and the layout/toggle can be tested; Task 6 replaces the stubs.

- [ ] **Step 4: Typecheck + build.**

Run: `npm run typecheck` then `npm run build`
Expected: clean.

- [ ] **Step 5: User test steps.**
  - Open the app → Quests tab: the Library rail appears on the left with the friendly empty state; the quest list sits to its right. Collapse/expand the rail with the chevron.
  - Go to Data tab → Productivity section: a "Quest Library" toggle exists. Turn it **off** → the rail disappears, Quests tab returns to single column. Turn it **on** → rail returns.
  - Confirm the look matches `mockups/quest-library-b.html` (this is a visual-approval gate — the user must accept it).

- [ ] **Step 6: Commit (with the user's OK).**

```bash
git add src/renderer/app/QuestsView.tsx src/renderer/app/features.ts src/renderer/app/DataView.tsx
git commit -m "feat(quest-library): mount rail in Quests tab + feature toggle"
```

---

## Task 6: Add-to-today flows (tap pre-fill + drag-drop) and template create/edit

**Files:**
- Modify: `src/renderer/app/QuestsView.tsx`

- [ ] **Step 1: Add the template-form modal state + open handlers in `QuestsView`.** Reuse the existing form-modal pattern QuestsView already uses for New/Edit quest. Add state to distinguish template-editing vs tap-add prefill:

```tsx
// New/Edit TEMPLATE (hideScheduling form). null = closed; 'new' or a template id.
const [templateForm, setTemplateForm] = useState<{ mode: 'new' | 'edit'; template: QuestTemplate | null } | null>(null)
// Tap-add: prefill the normal quest form from a template (user picks frame/due).
const [tapAddInitial, setTapAddInitial] = useState<QuestFormInitial | null>(null)

const openNewTemplate = () => setTemplateForm({ mode: 'new', template: null })
const openEditTemplate = (t: QuestTemplate) => setTemplateForm({ mode: 'edit', template: t })
const openTapAdd = (t: QuestTemplate) => setTapAddInitial({
  title: t.title,
  difficulty: t.difficulty,
  importance: t.importance,
  urgency: t.urgency,
  timeEstimateMinutes: t.timeEstimateMinutes,
  subTasks: t.subTasks
})
```

  - Import `QuestFormInitial` and `QuestTemplate` types.

- [ ] **Step 2: Render the template form (hideScheduling).** Next to the existing quest-form modal render, add:

```tsx
{templateForm && (
  <Modal onClose={() => setTemplateForm(null)}> {/* match the existing modal wrapper used for quests */}
    <QuestForm
      timeFrames={db?.timeFrames ?? []}
      initial={templateForm.template}
      defaultTimeFrameId={db?.timeFrames[0]?.id ?? ''}
      hideScheduling
      onSave={(input) => {
        if (templateForm.mode === 'new') void createTemplate(input)
        else if (templateForm.template) void updateTemplate(templateForm.template.id, input)
        setTemplateForm(null)
      }}
      onCancel={() => setTemplateForm(null)}
    />
  </Modal>
)}
```

- [ ] **Step 3: Render the tap-add prefill form (normal scheduling shown).**

```tsx
{tapAddInitial && (
  <Modal onClose={() => setTapAddInitial(null)}>
    <QuestForm
      timeFrames={db?.timeFrames ?? []}
      initial={tapAddInitial}
      defaultTimeFrameId={db?.timeFrames[0]?.id ?? ''}
      onSave={(input) => {
        void createQuest(input)
        setTapAddInitial(null)
      }}
      onCancel={() => setTapAddInitial(null)}
    />
  </Modal>
)}
```

  - Use the **same modal wrapper component** QuestsView already uses for the quest form (replace `<Modal>` above with that exact component/markup).

- [ ] **Step 4: Add the drag-drop branch to the time-frame card.** In the frame's `onDragOver` and `onDrop`, handle the template MIME *before* the existing quest-move logic. **Critical:** the existing `onDragOver` does `if (!dragId) return` before `preventDefault()` — a template drag never sets `dragId`, so without this change the drop event never fires. Detect the template via `e.dataTransfer.types`:

```tsx
onDragOver={(e) => {
  const isTemplate = e.dataTransfer.types.includes(TEMPLATE_DRAG_MIME)
  if (!dragId && !isTemplate) return
  e.preventDefault()
  e.dataTransfer.dropEffect = isTemplate ? 'copy' : 'move'
  if (overFrame !== frame.id) setOverFrame(frame.id)
}}
onDrop={(e) => {
  e.preventDefault()
  // Template drop (distinct MIME) takes precedence and must never be read as a quest move.
  const templateId = e.dataTransfer.getData(TEMPLATE_DRAG_MIME)
  if (templateId) {
    const t = (db?.questTemplates ?? []).find((x) => x.id === templateId)
    if (t) {
      void createQuest({
        title: t.title,
        difficulty: t.difficulty,
        importance: t.importance,
        urgency: t.urgency,
        timeEstimateMinutes: t.timeEstimateMinutes,
        subTasks: t.subTasks.map((s) => ({ title: s.title, timeEstimateMinutes: s.timeEstimateMinutes })),
        dueAt: null,
        timeFrameId: frame.id,
        recurDays: []
      })
    }
    setOverFrame(null)
    setOverQuest(null)
    return
  }
  // Existing quest-move behavior (unchanged).
  const id = e.dataTransfer.getData('text/plain') || dragId
  if (id) void moveQuestToFrame(id, frame.id)
  setOverFrame(null)
  setOverQuest(null)
  setDragId(null)
}}
```

  - Import `TEMPLATE_DRAG_MIME` from `./TemplateCard`.

- [ ] **Step 5: Typecheck + build.**

Run: `npm run typecheck` then `npm run build`
Expected: clean.

- [ ] **Step 6: User test steps.**
  - **Create:** rail "+ New template" → form opens with NO due-date/time-frame/Repeats fields → fill title/steps/badges → Save → card appears in the rail.
  - **Tap-add:** card "+ Add to today" → the normal quest form opens pre-filled (title/steps/badges), with due-date + time-frame shown → pick a frame → Save → quest appears in that frame.
  - **Drag-add:** drag a card onto a time-frame card → a quest is created instantly in that frame (no due date).
  - **Edit:** card "Edit" → form opens with the template's values → change → Save → card updates.
  - **Regression:** dragging a *live quest* between frames / reordering still works exactly as before.

- [ ] **Step 7: Commit (with the user's OK).**

```bash
git add src/renderer/app/QuestsView.tsx
git commit -m "feat(quest-library): tap + drag add-to-today and template create/edit"
```

---

## Task 7: "Save as template" on quest rows + delete confirmation polish

**Files:**
- Modify: `src/renderer/app/QuestsView.tsx`

- [ ] **Step 1: Add the "Save as template" ghost action to each quest row.** Insert into the existing `.quest-actions` container (after the Edit button, before Delete), gated on the feature being on so it doesn't appear when the Library is disabled:

```tsx
{libraryOn && (
  <button className="ghost" onClick={() => void saveQuestAsTemplate(q.id)} title="Save this as a reusable template">
    Save as template
  </button>
)}
```

- [ ] **Step 2: (Optional, low-stakes) confirm template delete.** `deleteTemplate` is immediate (matches `deleteQuest`). If desired, wrap the rail card's Delete with a `window.confirm('Delete this template? Quests you already created from it are not affected.')`. Keep it minimal — a blueprint is low-stakes. Skip if it complicates the card.

- [ ] **Step 3: Typecheck + build.**

Run: `npm run typecheck` then `npm run build`
Expected: clean.

- [ ] **Step 4: User test steps.**
  - On any quest row, "Save as template" → a matching card appears in the rail with the same title/steps/badges.
  - Turn the Library toggle off → "Save as template" no longer appears on quest rows; existing template data is retained (turn it back on to confirm the cards return).
  - Delete a template that you already added to today → the live quest is untouched.

- [ ] **Step 5: Commit (with the user's OK).**

```bash
git add src/renderer/app/QuestsView.tsx
git commit -m "feat(quest-library): save-as-template action on quest rows"
```

---

## Task 8: Playwright driver + rewards regression + final verification

**Files:**
- Create: `scripts/pw-library.mjs`
- Add: `pw:library` script to `package.json` (mirror the existing `pw:*` entries)

- [ ] **Step 1: Write `scripts/pw-library.mjs`.** Mirror the launch harness of `scripts/pw-townedit.mjs` exactly (isolated `--user-data-dir`, launch built `out/`, app-lock via the documented coordination path). It must cover, asserting each:
  1. Create a template from the rail (no scheduling fields shown) → card appears.
  2. "Save as template" on a quest → second card appears.
  3. **Tap-add:** open a template, pick a frame, Save → a quest with the right title/badges exists in that frame.
  4. **Drag-add:** drag a card onto a frame → a quest is created in that frame with `dueAt` null.
  5. Edit a template → card reflects the change.
  6. Delete a template → card removed; any quest created from it still exists.
  7. Collapse/expand the rail.
  8. Toggle `questLibrary` off via Data tab → rail hidden; reload → `db.json` still has the `questTemplates` entries (data persists); toggle on → rail returns.

- [ ] **Step 2: Run the new driver.**

Run: `npm run build` then `npm run pw:library`
Expected: all assertions pass. (Redirect output to a temp file and `Read` it to see PASS/FAIL lines past the hook filter, per CLAUDE.md.)

- [ ] **Step 3: Rewards regression — proves ↩ Restore is still exact.**

Run: `npm run pw:rewards`
Expected: passes unchanged (the reward path never reads templates).

- [ ] **Step 4: Final full typecheck.**

Run: `npm run typecheck`
Expected: clean (main + renderer).

- [ ] **Step 5: Acceptance check (the real-terms definition of done).**

Confirm end to end: "A user saves their gym-day quest as a template, then on a later day **taps** it (picks a frame, Save) **or drags** it onto a frame to recreate the quest; the new quest behaves like any normal quest; completing it awards, and ↩ Restore returns, the exact same XP as before the Library existed."

- [ ] **Step 6: Commit (with the user's OK).**

```bash
git add scripts/pw-library.mjs package.json
git commit -m "test(quest-library): pw-library driver + pw:library script"
```

---

## Self-Review (run against the spec)

**1. Spec coverage:**
- Side rail in Quests tab → Task 5. ✔
- Create from scratch → Task 6 (`openNewTemplate` + template form). ✔
- Save as template → Task 7. ✔
- Tap-add (pre-filled form) → Task 6 Step 3. ✔
- Drag-add (distinct MIME) → Task 6 Step 4. ✔
- Edit / Delete → Task 6 (edit) / Task 4+7 (delete). ✔
- Collapse/expand → Task 4 (rail state). ✔
- Feature toggle (don't seed; missing=ON) → Task 5 Step 1 + Task 1 Step 3 note. ✔
- Data model (Quest minus instance fields) → Task 1 Step 1. ✔
- Storage safety (wholesale-replace, validate reject-whole-save, migrate tolerance, never read by rewards) → Task 1 Steps 4-5 + Task 8 Step 3. ✔
- No recurrence on templates / newest-first sort / friendly empty state → Task 3 (hides Repeats), Task 4 (sort + empty state). ✔

**2. Placeholder scan:** The two stubbed handlers in Task 5 Step 3 are explicitly replaced in Task 6 (noted inline). CSS values are sourced from the named approved mockup (not a vague "add styles"). No TODO/TBD left.

**3. Type consistency:** `QuestTemplate` fields are identical across Task 1 (type), Task 2 (actions build it), Task 6 (drag-add reads it). The drag MIME constant is defined once (`TEMPLATE_DRAG_MIME` in `TemplateCard.tsx`) and imported in `QuestsView`. `QuestFormInitial` (Task 3) is consumed by both tap-add and template-edit. `createTemplate`/`updateTemplate`/`deleteTemplate`/`saveQuestAsTemplate` signatures match between the `AppStore` interface (Task 2 Step 1) and the implementations (Task 2 Step 3).

**Open integration points to verify during build (not gaps in logic, just things to confirm against live code):**
- The exact badge class scheme used by live quest rows (Task 4 Step 1 — copy it for the card).
- The exact modal wrapper component QuestsView uses for the quest form (Task 6 Steps 2-3).
- The `DataView` icon map includes `Books` (Task 5 Step 2).
