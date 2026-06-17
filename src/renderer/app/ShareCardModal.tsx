import { useEffect, useState } from 'react'
import { renderShareCardPng, type ShareCardData } from './shareCard'
import { X, DownloadSimple, Copy, Check } from '@phosphor-icons/react'

/**
 * Share-card preview modal. Renders the weekly recap to a PNG (canvas, zero deps)
 * and lets the user Save it or Copy it to the clipboard to drop into any chat.
 * Image-only: counts/streak/level/best-day + realm art — never quest titles.
 */
export function ShareCardModal({
  data,
  onClose
}: {
  data: ShareCardData
  onClose: () => void
}): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    renderShareCardPng(data)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setErr('Could not render the card.'))
    return () => {
      alive = false
    }
  }, [data])

  const save = (): void => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = 'questday-my-week.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const copy = async (): Promise<void> => {
    if (!url) return
    try {
      const blob = await (await fetch(url)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setErr('Copy isn’t available here — use Save instead.')
    }
  }

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <button className="share-close" aria-label="Close" onClick={onClose}>
          <X size={18} weight="bold" />
        </button>
        <h3>Share your week</h3>
        <p className="share-note">
          Image only — your counts, streak and realm. Never your quest titles or notes.
        </p>
        <div className="share-preview">
          {url ? (
            <img src={url} alt="Your week — share card" data-share-img />
          ) : (
            <div className="share-loading">{err ?? 'Rendering…'}</div>
          )}
        </div>
        <div className="share-actions">
          <button className="primary" onClick={save} disabled={!url}>
            <DownloadSimple size={16} weight="bold" /> Save PNG
          </button>
          <button className="ghost" onClick={() => void copy()} disabled={!url}>
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
