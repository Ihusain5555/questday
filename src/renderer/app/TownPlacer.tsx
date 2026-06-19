// DEV-ONLY tool: author where each town sits on the flat overworld image.
//
// This component is rendered ONLY behind `import.meta.env.DEV` (see RealmView), so Vite
// tree-shakes it (and the image import below) out of production builds entirely — real
// users never get it. It does NOT touch the real SVG map, the db.json schema, or the
// store; placements live in localStorage (this machine only). The Export button hands you
// a JSON list that later becomes a committed `TOWN_POSITIONS` config constant — the shipped
// source of truth, identical for every user (town positions are map-design data).
//
// Positions are stored as NORMALIZED fractions { x: 0..1, y: 0..1 } of the image, so they
// stay lined up at any window size / screen DPI (rendered as left:x*100%, top:y*100%).

import { useCallback, useEffect, useRef, useState } from 'react'
// Gitignored, dev-only art (unconfirmed bundle license — never committed to the public repo).
import overworldImg from '../assets/dev/overworld.png'

// The towns to place come from the real ATLAS.regions list (passed in by RealmView), so
// every region is covered and each `id` is exactly what onEnterTown(id) uses to open that
// region's inside-page in the NEXT feature.
type Town = { id: string; name: string }

type Norm = { x: number; y: number }
type Pos = { x: number; y: number; r: number }
type PosMap = Record<string, Pos>

const LS_KEY = 'questday.devTownPositions'
// Hover-circle radius as a fraction of the image WIDTH. The art is square (1024×1024),
// so one fraction is unambiguous and stays responsive at any display size.
const DEFAULT_R = 0.06
const MIN_R = 0.01
const MAX_R = 0.5

function loadPositions(): PosMap {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<Pos>>
    // Back-compat: older saves stored only {x,y}; fill a default radius.
    const out: PosMap = {}
    for (const [id, v] of Object.entries(parsed)) {
      if (typeof v?.x === 'number' && typeof v?.y === 'number') {
        out[id] = { x: v.x, y: v.y, r: typeof v.r === 'number' ? v.r : DEFAULT_R }
      }
    }
    return out
  } catch {
    return {}
  }
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))
const round4 = (n: number): number => Math.round(n * 10000) / 10000

export function TownPlacer({ towns }: { towns: Town[] }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [positions, setPositions] = useState<PosMap>(() => loadPositions())
  const [armed, setArmed] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)
  const [exportText, setExportText] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Persist every change to localStorage (this machine only — never db.json).
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(positions))
    } catch {
      /* ignore quota errors */
    }
  }, [positions])

  // Convert a pointer event to a normalized {x,y} within the image box.
  const toNorm = useCallback((clientX: number, clientY: number): Norm | null => {
    const el = imgRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return { x: clamp01((clientX - r.left) / r.width), y: clamp01((clientY - r.top) / r.height) }
  }, [])

  // Click on the map: if a town is armed, drop/move its pin there.
  const onMapClick = (e: React.MouseEvent): void => {
    if (!armed) return
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return
    setPositions((prev) => ({
      ...prev,
      [armed]: { x: round4(p.x), y: round4(p.y), r: prev[armed]?.r ?? DEFAULT_R },
    }))
    setArmed(null)
  }

  // Drag an existing pin to fine-tune it.
  const onPinPointerDown = (e: React.PointerEvent, id: string): void => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(id)
  }
  const onPinPointerMove = (e: React.PointerEvent, id: string): void => {
    if (dragging !== id) return
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return
    setPositions((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      return { ...prev, [id]: { ...cur, x: round4(p.x), y: round4(p.y) } }
    })
  }
  const onPinPointerUp = (e: React.PointerEvent): void => {
    if (dragging) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      setDragging(null)
    }
  }

  const resetPin = (id: string): void => {
    setPositions((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Set a town's hover-circle radius (clamped), keeping its position.
  const setRadius = (id: string, r: number): void => {
    setPositions((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      return { ...prev, [id]: { ...cur, r: round4(Math.min(MAX_R, Math.max(MIN_R, r))) } }
    })
  }

  // Drag the edge handle to resize the circle (radius = distance from center to pointer).
  const onResizeDown = (e: React.PointerEvent, id: string): void => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setResizing(id)
  }
  const onResizeMove = (e: React.PointerEvent, id: string): void => {
    if (resizing !== id) return
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return
    setPositions((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      const r = Math.min(MAX_R, Math.max(MIN_R, Math.hypot(p.x - cur.x, p.y - cur.y)))
      return { ...prev, [id]: { ...cur, r: round4(r) } }
    })
  }
  const onResizeUp = (e: React.PointerEvent): void => {
    if (resizing) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      setResizing(null)
    }
  }

  const doExport = (): void => {
    const list = towns.filter((t) => positions[t.id]).map((t) => ({
      id: t.id,
      name: t.name,
      x: positions[t.id].x,
      y: positions[t.id].y,
      r: positions[t.id].r,
    }))
    const text = JSON.stringify(list, null, 2)
    setExportText(text)
    void navigator.clipboard?.writeText(text).catch(() => {})
  }

  const placedCount = towns.filter((t) => positions[t.id]).length

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...btnStyle, position: 'absolute', top: 10, right: 10, zIndex: 40 }}
        title="DEV: place town markers on the flat map"
      >
        📍 Place towns
      </button>
    )
  }

  return (
    <div style={overlayStyle}>
      {/* Map + pins (left). The image fits INSIDE the box (contain) so the square art is
          never clipped; the pin layer wraps the image exactly, so % positions stay aligned. */}
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%', lineHeight: 0 }}>
          <img
            ref={imgRef}
            src={overworldImg}
            alt="overworld"
            onClick={onMapClick}
            draggable={false}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              userSelect: 'none',
              cursor: armed ? 'crosshair' : 'default',
              borderRadius: 6,
            }}
          />
          {/* hover-radius circles (under the pins). Diameter = 2r as a % of the wrapper;
              the square image makes width% and height% equal in px → a true circle. */}
          {towns.map((t) => {
            const p = positions[t.id]
            if (!p) return null
            const active = armed === t.id || resizing === t.id
            return (
              <div
                key={`circle-${t.id}`}
                style={{
                  position: 'absolute',
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  width: `${p.r * 200}%`,
                  height: `${p.r * 200}%`,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: active ? 'rgba(244,215,122,0.22)' : 'rgba(226,92,58,0.13)',
                  border: `1.5px solid ${active ? 'rgba(244,215,122,0.95)' : 'rgba(226,92,58,0.6)'}`,
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              />
            )
          })}
          {/* radius resize handles (drag to grow/shrink the circle) */}
          {towns.map((t) => {
            const p = positions[t.id]
            if (!p) return null
            return (
              <div
                key={`handle-${t.id}`}
                onPointerDown={(e) => onResizeDown(e, t.id)}
                onPointerMove={(e) => onResizeMove(e, t.id)}
                onPointerUp={onResizeUp}
                title={`Drag to resize ${t.name}'s circle`}
                style={{
                  position: 'absolute',
                  left: `${(p.x + p.r) * 100}%`,
                  top: `${p.y * 100}%`,
                  width: 11,
                  height: 11,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #e25c3a',
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  zIndex: 31,
                }}
              />
            )
          })}
          {towns.map((t) => {
            const p = positions[t.id]
            if (!p) return null
            const isArmed = armed === t.id
            return (
              <div
                key={t.id}
                onPointerDown={(e) => onPinPointerDown(e, t.id)}
                onPointerMove={(e) => onPinPointerMove(e, t.id)}
                onPointerUp={onPinPointerUp}
                style={{
                  position: 'absolute',
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  transform: 'translate(-50%, -100%)',
                  cursor: 'grab',
                  touchAction: 'none',
                  zIndex: 30,
                }}
                title={`${t.name} (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`}
              >
                <div style={{ ...pinLabelStyle, outline: isArmed ? '2px solid #f4d77a' : 'none' }}>
                  {t.name}
                </div>
                <div style={pinStemStyle} />
                <div style={pinDotStyle} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls (right) */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 13 }}>📍 Place towns (DEV)</strong>
          <button type="button" style={smallBtn} onClick={() => setOpen(false)}>
            ✕ Close
          </button>
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.4 }}>
          {armed
            ? `Click the map where "${towns.find((t) => t.id === armed)?.name}" sits.`
            : 'Click a town → click its spot. Drag the pin to move; drag the white edge handle (or the slider) to size its hover circle.'}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700 }}>
          {placedCount} / {towns.length} placed
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {towns.map((t) => {
            const p = positions[t.id]
            return (
              <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setArmed(armed === t.id ? null : t.id)}
                    style={{
                      ...townRowBtn,
                      background: armed === t.id ? '#f4d77a' : p ? '#2c4a40' : '#3a3a3a',
                      color: armed === t.id ? '#1e3a36' : '#e8e0cf',
                    }}
                    title={p ? 'Re-arm to move, or just drag the pin' : 'Arm to place'}
                  >
                    <span>{p ? '✓' : '○'} {t.name}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      {p ? `${p.x.toFixed(2)}, ${p.y.toFixed(2)}` : 'unplaced'}
                    </span>
                  </button>
                  {p && (
                    <button type="button" style={smallBtn} onClick={() => resetPin(t.id)} title="Reset this pin">
                      ↺
                    </button>
                  )}
                </div>
                {p && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                    <span style={{ fontSize: 9, opacity: 0.65, width: 48, whiteSpace: 'nowrap' }}>
                      r {p.r.toFixed(3)}
                    </span>
                    <input
                      type="range"
                      min={MIN_R}
                      max={0.4}
                      step={0.005}
                      value={p.r}
                      onChange={(e) => setRadius(t.id, parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: '#e25c3a' }}
                      title="Radius of the hover circle"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" style={{ ...btnStyle, width: '100%' }} onClick={doExport}>
          ⬇ Export {placedCount} position{placedCount === 1 ? '' : 's'} (copies to clipboard)
        </button>
        {exportText && (
          <textarea
            readOnly
            value={exportText}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              height: 120,
              fontSize: 10,
              fontFamily: 'monospace',
              background: '#11231f',
              color: '#cfe7da',
              border: '1px solid #2c4a40',
              borderRadius: 4,
              padding: 6,
              resize: 'vertical',
            }}
          />
        )}
      </div>
    </div>
  )
}

// --- inline styles (kept local so this dev tool touches no shared CSS) ---
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 35,
  display: 'flex',
  gap: 10,
  padding: 10,
  background: 'rgba(15, 30, 27, 0.96)',
  borderRadius: 8,
  overflow: 'hidden',
}
const panelStyle: React.CSSProperties = {
  flex: '0 0 240px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  background: '#16221f',
  border: '1px solid #2c4a40',
  borderRadius: 6,
  color: '#e8e0cf',
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  maxHeight: '100%',
}
const btnStyle: React.CSSProperties = {
  background: '#f4d77a',
  color: '#1e3a36',
  border: 'none',
  borderRadius: 6,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}
const smallBtn: React.CSSProperties = {
  background: '#2c4a40',
  color: '#e8e0cf',
  border: 'none',
  borderRadius: 4,
  padding: '3px 7px',
  fontSize: 11,
  cursor: 'pointer',
}
const townRowBtn: React.CSSProperties = {
  flex: '1 1 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  borderRadius: 4,
  padding: '5px 8px',
  fontSize: 11,
  cursor: 'pointer',
  textAlign: 'left',
}
const pinLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  background: '#1e3a36',
  color: '#f4d77a',
  padding: '2px 5px',
  borderRadius: 4,
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  transform: 'translateY(-2px)',
}
const pinStemStyle: React.CSSProperties = {
  width: 2,
  height: 8,
  background: '#f4d77a',
  margin: '0 auto',
}
const pinDotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: '#e25c3a',
  border: '2px solid #fff',
  margin: '0 auto',
  boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
}
