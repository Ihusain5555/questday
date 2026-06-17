import { useState } from 'react'
import { useStore } from '../state/store'
import { TOGGLEABLE_FEATURES, isFeatureEnabled } from './features'
import {
  FileText,
  Sword,
  Trophy,
  Hourglass,
  DownloadSimple,
  UploadSimple,
  Trash,
  Timer,
  Compass,
  MapTrifold,
  Books,
  Mosque,
  CalendarCheck,
  type Icon
} from '@phosphor-icons/react'

/** Feature icon name (from the registry) -> Phosphor component, mirroring the
 *  tab icons in App.tsx so the toggle list matches the tabs. */
const FEATURE_ICON: Record<string, Icon> = {
  Timer,
  Compass,
  MapTrifold,
  Books,
  Mosque,
  CalendarCheck
}

/**
 * Data & backup (§10). Auto-backups run quietly in the background; here the user
 * can Export a single opaque backup file (for transfer to another PC) and Import
 * one to restore. The file is not human-readable — it's for backup, not editing.
 */
export function DataView(): JSX.Element {
  const { db, refresh, updateSettings } = useStore()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmImport, setConfirmImport] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const [busy, setBusy] = useState(false)

  const counts = db
    ? {
        quests: db.quests.length,
        active: db.quests.filter((q) => q.status === 'active').length,
        completed: db.quests.filter((q) => q.status === 'completed').length,
        frames: db.timeFrames.length
      }
    : null

  const doExport = async () => {
    setBusy(true)
    setMsg(null)
    const r = await window.questday.backup.export()
    setBusy(false)
    if (r.ok) setMsg({ kind: 'ok', text: `Backup saved to ${r.path}` })
    else if (!r.canceled) setMsg({ kind: 'err', text: r.error ?? 'Export failed.' })
  }

  const doReset = async () => {
    setConfirmReset(false)
    setResetPhrase('')
    setBusy(true)
    setMsg(null)
    await window.questday.backup.resetAll()
    await refresh()
    setBusy(false)
    setMsg({
      kind: 'ok',
      text: 'Fresh start ✨ — a final backup of your old data was saved to the backups folder.'
    })
  }

  const doImport = async () => {
    setConfirmImport(false)
    setBusy(true)
    setMsg(null)
    const r = await window.questday.backup.import()
    setBusy(false)
    if (r.ok) {
      await refresh()
      setMsg({ kind: 'ok', text: 'Backup restored. Your quests and progress are back.' })
    } else if (!r.canceled) {
      setMsg({ kind: 'err', text: r.error ?? 'Import failed.' })
    }
  }

  return (
    <div>
      <div className="view-head">
        <h2>Data &amp; backup</h2>
      </div>
      <p className="tagline">
        Your data lives only on this PC — no account, no cloud. QuestDay also saves quiet automatic
        backups in the background, so a crash never costs you a day.
      </p>

      {counts && (
        <div className="card">
          <div className="stat-row">
            <div className="stat">
              <div className="label">
                <FileText size={13} weight="fill" /> Quests
              </div>
              <div className="value">{counts.quests}</div>
            </div>
            <div className="stat">
              <div className="label">
                <Sword size={13} weight="fill" color="var(--brand-bright)" /> Active
              </div>
              <div className="value">{counts.active}</div>
            </div>
            <div className="stat">
              <div className="label">
                <Trophy size={13} weight="fill" color="var(--gold)" /> Completed
              </div>
              <div className="value">{counts.completed}</div>
            </div>
            <div className="stat">
              <div className="label">
                <Hourglass size={13} weight="fill" /> Time frames
              </div>
              <div className="value">{counts.frames}</div>
            </div>
          </div>
        </div>
      )}

      {db && (
        <div className="card">
          <strong>Productivity features</strong>
          <p className="meta-dim" style={{ marginTop: 4 }}>
            Switch extra productivity tools on or off. Turning one off just hides its tab — your
            data and progress are kept, nothing is lost.
          </p>
          <div className="feature-toggles">
            {TOGGLEABLE_FEATURES.map((f) => {
              const on = isFeatureEnabled(db.settings.enabledFeatures, f.id)
              const FIcon = FEATURE_ICON[f.icon] ?? Timer
              return (
                <div className="feature-toggle" key={f.id}>
                  <div className="ft-text">
                    <div className="ft-name">
                      <FIcon size={15} weight="fill" className="ft-icon" /> {f.label}
                    </div>
                    <div className="ft-blurb meta-dim">{f.blurb}</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        void updateSettings({
                          enabledFeatures: { ...db.settings.enabledFeatures, [f.id]: e.target.checked }
                        })
                      }
                    />
                    <span>{on ? 'On' : 'Off'}</span>
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {db && (
        <div className="card">
          <div className="view-head" style={{ marginBottom: 0 }}>
            <strong>Start with Windows</strong>
            <label className="switch">
              <input
                type="checkbox"
                checked={db.settings.launchOnLogin}
                onChange={(e) => void updateSettings({ launchOnLogin: e.target.checked })}
              />
              <span>{db.settings.launchOnLogin ? 'On' : 'Off'}</span>
            </label>
          </div>
          <p className="meta-dim" style={{ marginTop: 4 }}>
            Launch QuestDay when you sign in, so your current quest is always one glance away.
            It starts quietly: just the widget and tray icon — the main window stays out of the
            way until you want it.
          </p>
        </div>
      )}

      <div className="card">
        <strong>Export / Import</strong>
        <p className="meta-dim" style={{ marginTop: 4 }}>
          Export writes one <code>.questday</code> file you can copy to another PC and Import there.
          The file is encrypted/compressed and not meant to be opened or read directly.
        </p>
        <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <button className="primary" disabled={busy} onClick={doExport}>
            <DownloadSimple size={16} weight="bold" /> Export backup
          </button>
          <button disabled={busy} onClick={() => setConfirmImport(true)}>
            <UploadSimple size={16} weight="bold" /> Import backup…
          </button>
        </div>
        {msg && <div className={`backup-msg ${msg.kind}`}>{msg.text}</div>}
      </div>

      <div className="card danger-zone">
        <strong>Start fresh</strong>
        <p className="meta-dim" style={{ marginTop: 4 }}>
          Reset everything on this PC — quests, progress, your Realm, and settings — back to a clean
          slate. A final backup of your current data is saved first (and your automatic backups
          are kept), so even this is recoverable via Import.
        </p>
        <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <button className="ghost danger" disabled={busy} onClick={() => setConfirmReset(true)}>
<Trash size={15} weight="bold" /> Reset all data…
          </button>
        </div>
      </div>

      {confirmReset && (
        <div className="modal-backdrop" onMouseDown={() => setConfirmReset(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2>Reset everything?</h2>
            <p className="tagline">
              This wipes your quests, XP, your Realm, and settings on this PC and starts over.
              A backup of your current data is saved first. To confirm, type <strong>RESET</strong>
              {' '}below.
            </p>
            <input
              autoFocus
              placeholder="Type RESET to confirm"
              value={resetPhrase}
              onChange={(e) => setResetPhrase(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setConfirmReset(false)}>Cancel</button>
              <button
                className="ghost danger"
                disabled={resetPhrase.trim().toUpperCase() !== 'RESET'}
                onClick={doReset}
              >
                Reset all data
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmImport && (
        <div className="modal-backdrop" onMouseDown={() => setConfirmImport(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2>Restore from a backup?</h2>
            <p className="tagline">
              This replaces your current quests, time frames, and progress with the backup's
              contents. Your latest auto-backup is kept either way.
            </p>
            <div className="modal-actions">
              <button onClick={() => setConfirmImport(false)}>Cancel</button>
              <button className="primary" onClick={doImport}>
                Choose file &amp; restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
