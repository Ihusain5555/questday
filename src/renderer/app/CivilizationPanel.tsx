import { Buildings, MapPin } from '@phosphor-icons/react'
import { civSummary } from '@shared/engine/civilization'
import type { Quest } from '@shared/types'

// TEMPORARY scaffold (v1.10, step 1): a live, text-only readout proving the
// civilization engine is wired to real quest data. Everything shown is DERIVED
// from all-time completions (nothing persisted), so ↩ Restore stays exact. The
// real isometric town (canvas + CC0 art) replaces this whole panel in step 2 —
// hence the throwaway inline styles (they vanish with the panel).
export function CivilizationPanel({ quests }: { quests: Quest[] }): JSX.Element {
  const civ = civSummary(quests)
  return (
    <div
      style={{
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-card)',
        padding: '16px 18px',
        marginBottom: 16,
        boxShadow: 'var(--shadow-1)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--gold)',
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: 'uppercase'
        }}
      >
        <Buildings size={18} weight="fill" />
        <span>Your Realm — coming to life</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text)' }}>
          {civ.stageName}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          {civ.nextStageName
            ? `${civ.into} / ${civ.span} quests to ${civ.nextStageName}`
            : 'Empire reached — the world is yours'}
        </span>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: 'rgb(var(--brand-rgb) / 0.16)',
          overflow: 'hidden',
          marginTop: 10
        }}
        aria-hidden
      >
        <div
          style={{
            height: '100%',
            width: `${civ.percent}%`,
            background: 'linear-gradient(90deg, var(--brand), var(--brand-bright))',
            borderRadius: 999,
            transition: 'width .4s ease'
          }}
        />
      </div>

      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 6 }}>
        {civ.towns.map((t) => (
          <li
            key={t.town.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: t.unlocked ? 1 : 0.55 }}
          >
            <MapPin
              size={15}
              weight={t.unlocked ? 'fill' : 'regular'}
              color={t.unlocked ? 'var(--gold)' : 'var(--muted)'}
            />
            <span style={{ color: 'var(--text)', fontSize: 14 }}>{t.town.name}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 'auto' }}>
              {t.unlocked
                ? 'settled'
                : t.comingSoon
                  ? `coming soon · ${t.toUnlock} to go`
                  : `${t.toUnlock} quests to settle`}
            </span>
          </li>
        ))}
      </ul>

      <p style={{ color: 'var(--muted)', fontSize: 12, margin: '12px 0 0', fontStyle: 'italic' }}>
        Scaffold preview — your living isometric town with real art arrives next.
      </p>
    </div>
  )
}
