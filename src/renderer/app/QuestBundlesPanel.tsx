import { useState } from 'react'
import { useStore } from '../state/store'
import { Stack, Plus, Trash, DownloadSimple } from '@phosphor-icons/react'

/**
 * Quest Bundles (v2) — a calm panel inside the Quests tab (toggle `questBundles`). Save the
 * current active quests as a named bundle, then add a bundle's quests to a day in one tap.
 * Gains-only: applying a bundle only ADDS quests; deleting a bundle never touches the quests
 * already created from it. The bundle store is never read by reward math, so ↩ Restore stays exact.
 */
export function QuestBundlesPanel(): JSX.Element | null {
  const { db, createBundleFromActive, applyBundle, deleteBundle } = useStore()
  const [name, setName] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  if (!db) return null

  const bundles = [...db.questBundles].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const activeCount = db.quests.filter((q) => q.status === 'active').length

  const announce = (msg: string): void => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2000)
  }

  const save = async (): Promise<void> => {
    if (activeCount === 0) return
    await createBundleFromActive(name)
    setName('')
    announce(`Saved ${activeCount} ${activeCount === 1 ? 'quest' : 'quests'} as a bundle ✓`)
  }

  const apply = async (id: string, label: string): Promise<void> => {
    const n = await applyBundle(id)
    announce(`Added ${n} ${n === 1 ? 'quest' : 'quests'} from “${label}” ✓`)
  }

  return (
    <div className="card bundles-panel">
      <div className="bundles-head">
        <Stack size={18} weight="fill" />
        <strong>Quest Bundles</strong>
      </div>
      <p className="bundles-blurb">Save a set of quests and add them all to a day in one tap.</p>

      <div className="bundles-save">
        <input
          className="bundles-name"
          placeholder="Name a bundle of today’s quests…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
          aria-label="Bundle name"
        />
        <button className="primary" disabled={activeCount === 0} onClick={() => void save()}>
          <Plus size={14} weight="bold" /> Save {activeCount > 0 ? `${activeCount} ` : ''}as bundle
        </button>
      </div>

      {flash && <div className="bundles-flash">{flash}</div>}

      {bundles.length === 0 ? (
        <div className="bundles-empty">
          No bundles yet. Name your current quests above and save them to make one.
        </div>
      ) : (
        <ul className="bundles-list">
          {bundles.map((b) => (
            <li className="bundle-row" key={b.id}>
              <div className="bundle-info">
                <span className="bundle-name-label">{b.name}</span>
                <span className="bundle-count">
                  {b.quests.length} {b.quests.length === 1 ? 'quest' : 'quests'}
                </span>
              </div>
              <button className="ghost" onClick={() => void apply(b.id, b.name)} title="Add these quests to today">
                <DownloadSimple size={14} weight="bold" /> Add to today
              </button>
              <button
                className="icon-btn bundle-del"
                onClick={() => void deleteBundle(b.id)}
                title="Delete this bundle (quests already added stay)"
                aria-label={`Delete bundle ${b.name}`}
              >
                <Trash size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
