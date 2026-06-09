import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useStore } from '../state/store'
import { useNow } from '../hooks/useNow'
import { selectCurrentQuest } from '@shared/engine/selectCurrentQuest'
import { FrictionPrompt } from './FrictionPrompt'
import type { ActiveModeTier } from '@shared/types'

const TIER_INFO: { key: ActiveModeTier; name: string; desc: string }[] = [
  {
    key: 'awareness',
    name: '1 · Awareness',
    desc: 'A quiet periodic reminder of your current quest. Lightest touch.'
  },
  {
    key: 'nudge',
    name: '2 · Gentle nudge',
    desc: 'A non-blocking heads-up when your active time frame is ending. Easy to snooze.'
  },
  {
    key: 'softFriction',
    name: '3 · Soft friction',
    desc: 'A short "are you sure?" pause when you open something you flagged as distracting.'
  },
  {
    key: 'hardBlock',
    name: '4 · Hard block',
    desc: 'Flagged apps get minimized behind a block screen — with a guilt-free timed break pass always one click away. No admin needed.'
  }
]

export function ActiveModeSettings(): JSX.Element {
  const { db, updateSettings } = useStore()
  const now = useNow(20000)
  const [newApp, setNewApp] = useState('')
  const [previewFriction, setPreviewFriction] = useState(false)

  if (!db) return <div>Loading…</div>
  const s = db.settings
  const on = s.activeModeEnabled
  const current = selectCurrentQuest(db.quests, db.timeFrames, now)

  const setTier = (key: ActiveModeTier, value: boolean) =>
    updateSettings({ activeModeTiers: { ...s.activeModeTiers, [key]: value } })

  const addApp = () => {
    const v = newApp.trim()
    if (!v) return
    updateSettings({ distractingApps: [...s.distractingApps, v] })
    setNewApp('')
  }
  const removeApp = (v: string) =>
    updateSettings({ distractingApps: s.distractingApps.filter((a) => a !== v) })

  return (
    <div>
      <div className="view-head">
        <h2>Active mode</h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => updateSettings({ activeModeEnabled: e.target.checked })}
          />
          <span>{on ? 'On' : 'Off'}</span>
        </label>
      </div>
      <p className="tagline">
        Off by default — QuestDay just shows what's next and you choose to follow it. Turn this on
        for gentle accountability. Every tier is opt-in, reversible, and never punitive.
      </p>

      <div className={`card tier-card ${on ? '' : 'disabled-card'}`}>
        {TIER_INFO.map((t) => {
          return (
            <div className="tier-row" key={t.key}>
              <label className="switch tier-switch">
                <input
                  type="checkbox"
                  disabled={!on}
                  checked={s.activeModeTiers[t.key]}
                  onChange={(e) => setTier(t.key, e.target.checked)}
                />
              </label>
              <div className="tier-text">
                <div className="tier-name">{t.name}</div>
                <div className="tier-desc">{t.desc}</div>

                {t.key === 'awareness' && on && s.activeModeTiers.awareness && (
                  <div className="tier-config">
                    Remind me every
                    <input
                      type="number"
                      min={1}
                      value={s.reminderIntervalMin}
                      onChange={(e) =>
                        updateSettings({ reminderIntervalMin: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                    min
                    <button className="ghost" onClick={() => void window.questday.activeMode.test()}>
                      Send test reminder
                    </button>
                  </div>
                )}

                {t.key === 'nudge' && on && s.activeModeTiers.nudge && (
                  <div className="tier-config">
                    Nudge me
                    <input
                      type="number"
                      min={1}
                      value={s.frameEndingLeadMin}
                      onChange={(e) =>
                        updateSettings({ frameEndingLeadMin: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                    min before a frame ends
                  </div>
                )}

                {t.key === 'softFriction' && on && s.activeModeTiers.softFriction && (
                  <div className="tier-config">
                    <button className="ghost" onClick={() => setPreviewFriction(true)}>
                      Preview the friction prompt
                    </button>
                    <span className="meta-dim">(auto-trigger needs detection — see below)</span>
                  </div>
                )}

                {t.key === 'hardBlock' && on && s.activeModeTiers.hardBlock && (
                  <div className="tier-config">
                    Break pass length
                    <input
                      type="number"
                      min={1}
                      value={s.blockBreakPassMin}
                      onChange={(e) =>
                        updateSettings({ blockBreakPassMin: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                    min
                    <span className="meta-dim">(sites are best-effort via window title)</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className={`card ${on ? '' : 'disabled-card'}`}>
        <strong>Distracting apps / sites</strong>
        <p className="meta-dim" style={{ marginTop: 4 }}>
          Used by soft friction (and, later, hard block). Add an app name or domain, e.g.{' '}
          <code>youtube.com</code> or <code>Steam</code>.
        </p>
        <div className="chip-list">
          {s.distractingApps.length === 0 && <span className="meta-dim">None yet.</span>}
          {s.distractingApps.map((a) => (
            <span className="chip" key={a}>
              {a}
              <button
                className="chip-x"
                aria-label={`Remove ${a}`}
                onClick={() => removeApp(a)}
                title="Remove"
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          ))}
        </div>
        <div className="add-frame" style={{ marginTop: 10 }}>
          <input
            placeholder="Add app or site…"
            value={newApp}
            disabled={!on}
            onChange={(e) => setNewApp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addApp()}
          />
          <button className="primary" disabled={!on} onClick={addApp}>
            + Add
          </button>
        </div>
      </div>

      {previewFriction && (
        <FrictionPrompt
          appName={s.distractingApps[0] ?? 'a distracting app'}
          questTitle={current?.title ?? null}
          onProceed={() => setPreviewFriction(false)}
          onCancel={() => setPreviewFriction(false)}
        />
      )}
    </div>
  )
}
