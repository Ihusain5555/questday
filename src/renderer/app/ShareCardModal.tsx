import { useEffect, useMemo, useState } from 'react'
import {
  renderShareCardPng,
  dataUrlToBlob,
  DEFAULT_STYLE,
  SHARE_THEMES,
  SHARE_FORMATS,
  SHARE_EFFECTS,
  type ShareCardData,
  type ShareStyle,
  type ShareTheme,
  type ShareFormat,
  type ShareEffect
} from './shareCard'
import { X, DownloadSimple, Copy, Check } from '@phosphor-icons/react'

const STYLE_KEY = 'questday.shareStyle'
const THEME_IDS = SHARE_THEMES.map((t) => t.id)
const FORMAT_IDS = SHARE_FORMATS.map((f) => f.id)
const EFFECT_IDS = SHARE_EFFECTS.map((e) => e.id)

/** Load the last-used style from localStorage (a pure UI preference — NOT db.json, so no
 *  schema change). Falls back to the default on anything malformed. */
function loadStyle(): ShareStyle {
  try {
    const raw = localStorage.getItem(STYLE_KEY)
    if (!raw) return DEFAULT_STYLE
    const s = JSON.parse(raw) as Partial<ShareStyle>
    return {
      theme: THEME_IDS.includes(s.theme as ShareTheme) ? (s.theme as ShareTheme) : DEFAULT_STYLE.theme,
      format: FORMAT_IDS.includes(s.format as ShareFormat) ? (s.format as ShareFormat) : DEFAULT_STYLE.format,
      effect: EFFECT_IDS.includes(s.effect as ShareEffect) ? (s.effect as ShareEffect) : DEFAULT_STYLE.effect
    }
  } catch {
    return DEFAULT_STYLE
  }
}

/** A live, decorative animation over the preview ONLY — snow falls, confetti drifts,
 *  sparkles twinkle. The EXPORTED png has the frozen version (canvas), never this. Honors
 *  reduce-motion via CSS (.share-fx particles get animation:none). */
function PreviewEffect({ effect }: { effect: ShareEffect }): JSX.Element | null {
  // Stable per-mount particle layout (index-derived, deterministic — no Math.random reflow).
  const bits = useMemo(() => {
    if (effect === 'none') return []
    const n = effect === 'confetti' ? 26 : effect === 'snow' ? 20 : 16
    return Array.from({ length: n }, (_, i) => ({
      left: (i * 61.8) % 100,
      top: ((i * 38) % 82) + 6, // only used by sparkle (twinkles in place)
      delay: -((i * 0.47) % 4).toFixed(2),
      dur: (effect === 'sparkle' ? 2 : 4.5) + ((i * 7) % 5) * 0.5,
      drift: ((i % 5) - 2) * 14,
      hue: ['#f5b938', '#3fe0a8', '#c5403a', '#54c8f0', '#ffcf5c', '#d3b1ee'][i % 6],
      size: effect === 'snow' ? 4 + (i % 3) * 2 : effect === 'confetti' ? 8 : 6
    }))
  }, [effect])
  if (effect === 'none') return null
  return (
    <div className={`share-fx-layer share-fx-${effect}`} aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className="share-fx"
          style={
            {
              left: `${b.left}%`,
              top: effect === 'sparkle' ? `${b.top}%` : undefined,
              width: `${b.size}px`,
              height: `${effect === 'confetti' ? b.size * 0.6 : b.size}px`,
              background: effect === 'confetti' ? b.hue : undefined,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
              ['--drift' as string]: `${b.drift}px`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/**
 * Share-card STUDIO modal. Renders a recap to a PNG (canvas, zero deps) under a chosen
 * theme/format/effect, with a live animated preview, and lets the user Save or Copy it.
 * Image-only — never quest titles. Used by the weekly, arcade and journey cards alike.
 */
export function ShareCardModal({ data, onClose }: { data: ShareCardData; onClose: () => void }): JSX.Element {
  const [style, setStyle] = useState<ShareStyle>(loadStyle)
  const [url, setUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const filename =
    data.kind === 'arcade'
      ? 'questday-arcade-score.png'
      : data.kind === 'journey'
        ? 'questday-my-journey.png'
        : 'questday-my-week.png'

  // persist the chosen style (UI-only preference)
  useEffect(() => {
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(style))
    } catch {
      /* ignore quota/private-mode errors */
    }
  }, [style])

  // re-render whenever the data or style changes
  useEffect(() => {
    let alive = true
    setRendering(true)
    renderShareCardPng(data, style)
      .then((u) => {
        if (alive) {
          setUrl(u)
          setRendering(false)
        }
      })
      .catch(() => {
        if (alive) {
          setErr('Could not render the card.')
          setRendering(false)
        }
      })
    return () => {
      alive = false
    }
  }, [data, style])

  const save = (): void => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const copy = async (): Promise<void> => {
    if (!url) return
    try {
      const blob = dataUrlToBlob(url)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setErr('Copy isn’t available here — use Save instead.')
    }
  }

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-modal share-studio" onClick={(e) => e.stopPropagation()}>
        <button className="share-close" aria-label="Close" onClick={onClose}>
          <X size={18} weight="bold" />
        </button>
        <h3>Share your progress</h3>
        <p className="share-note">Image only — your counts, streak and art. Never your quest titles or notes.</p>

        <div className={`share-preview share-fmt-${style.format}`}>
          {url ? (
            <span className="share-preview-frame">
              <img src={url} alt="Your share card" data-share-img />
              <PreviewEffect effect={style.effect} />
            </span>
          ) : (
            <div className="share-loading">{err ?? 'Rendering…'}</div>
          )}
        </div>

        <div className="share-picker">
          <div className="share-pick-group">
            <span className="share-pick-label">Theme</span>
            <div className="share-pick-opts">
              {SHARE_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`share-opt share-theme-${t.id} ${style.theme === t.id ? 'on' : ''}`}
                  onClick={() => setStyle((s) => ({ ...s, theme: t.id }))}
                  title={t.blurb}
                >
                  <span className="share-theme-swatch" />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="share-pick-group">
            <span className="share-pick-label">Format</span>
            <div className="share-pick-opts">
              {SHARE_FORMATS.map((f) => (
                <button
                  key={f.id}
                  className={`share-opt ${style.format === f.id ? 'on' : ''}`}
                  onClick={() => setStyle((s) => ({ ...s, format: f.id }))}
                >
                  <span className={`share-fmt-icon fmt-${f.id}`} />
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="share-pick-group">
            <span className="share-pick-label">Effect</span>
            <div className="share-pick-opts">
              {SHARE_EFFECTS.map((e) => (
                <button
                  key={e.id}
                  className={`share-opt ${style.effect === e.id ? 'on' : ''}`}
                  onClick={() => setStyle((s) => ({ ...s, effect: e.id }))}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="share-actions">
          <button className="primary" onClick={save} disabled={!url || rendering}>
            <DownloadSimple size={16} weight="bold" /> Save PNG
          </button>
          <button className="ghost" onClick={() => void copy()} disabled={!url || rendering}>
            {copied ? (
              <>
                <Check size={16} weight="bold" /> Copied
              </>
            ) : (
              <>
                <Copy size={16} weight="bold" /> Copy image
              </>
            )}
          </button>
        </div>
        {err && url && <p className="share-err">{err}</p>}
      </div>
    </div>
  )
}
