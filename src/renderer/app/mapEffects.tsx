// ---------------------------------------------------------------------------
// Map ambient effects — weather + points-of-interest layered onto the Terra Questa
// world map (RealmView's RealmMap). Pure inline SVG + CSS keyframes, ZERO new deps,
// self-authored inked-watercolor art (CC0/own). Every animated element carries the
// shared `realm-fx` class so the existing pause-when-hidden rule
// (`.realm-anim-paused .realm-fx`) stops it, and the new effects respect OS
// reduce-motion (`.realm-fx { animation:none }`) — flashing/particles are an
// accessibility concern, unlike the always-on gentle base map motion.
//
// Tone rule (gains-only): NOTHING here depicts loss. "Fire" is a cozy bonfire that
// never spreads + a seasonal grove that cross-fades summer→autumn→spring blossom
// (always lands on MORE). No destruction, ever. Placement is by biome
// (REGION_BIOME). Rendered only when `!lite` (skipped on the Dashboard thumbnail).
// ---------------------------------------------------------------------------

// Region centres (derived from balance.realm.atlases[0].regions: each region path is
// `M{cx-58} {cy} a58 54 …`, so centre = (Mx+58, My)).
const C: Record<string, { x: number; y: number }> = {
  embergreen: { x: 620, y: 426 },
  goldfield: { x: 600, y: 246 },
  sunmeadow: { x: 815, y: 216 },
  larkholt: { x: 600, y: 606 },
  tidesend: { x: 270, y: 491 },
  crownspire: { x: 820, y: 351 },
  rivenwood: { x: 430, y: 366 },
  palevale: { x: 410, y: 221 },
  greymoor: { x: 770, y: 486 },
  quietfens: { x: 420, y: 606 },
  mistisles: { x: 995, y: 366 },
  hollowreach: { x: 210, y: 654 },
  sunkenmarsh: { x: 790, y: 606 },
  ashlands: { x: 470, y: 476 },
  beyondveil: { x: 1052, y: 616 }
}
const RX = 54
const RY = 50

// Deterministic sunflower scatter inside an ellipse (no Math.random → stable across
// renders, so particles never jump on a re-render).
function scatter(n: number, rx: number, ry: number, seed = 0.5): { dx: number; dy: number }[] {
  const out: { dx: number; dy: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = i * 2.399963 + seed * 6.283
    const r = Math.sqrt((i + 0.5) / n)
    out.push({ dx: Math.cos(a) * r * rx, dy: Math.sin(a) * r * ry })
  }
  return out
}

const INK = '#5a4a2e'

// ---- weather --------------------------------------------------------------
function Snow({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      {scatter(16, RX * 0.95, RY * 0.75, 0.3).map((p, i) => (
        <circle
          key={i}
          className="realm-fx fx-snow"
          cx={x + p.dx}
          cy={y + p.dy}
          r={1.7}
          fill="#ffffff"
          style={{ animationDelay: `-${((i * 0.63) % 6).toFixed(2)}s`, animationDuration: `${5 + (i % 3) * 1.5}s` }}
        />
      ))}
    </g>
  )
}

function Rain({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      {scatter(14, RX * 0.9, RY * 0.8, 0.7).map((p, i) => (
        <line
          key={i}
          className="realm-fx fx-rain"
          x1={x + p.dx}
          y1={y + p.dy}
          x2={x + p.dx - 3}
          y2={y + p.dy + 9}
          stroke="#bcd6e0"
          strokeWidth={1.2}
          strokeLinecap="round"
          style={{ animationDelay: `-${((i * 0.27) % 1).toFixed(2)}s`, animationDuration: `${0.85 + (i % 3) * 0.18}s` }}
        />
      ))}
    </g>
  )
}

function Haze({ x, y, tint, op, dur }: { x: number; y: number; tint: string; op: number; dur: number }): JSX.Element {
  // Reused by sandstorm (amber) and fog (white): two oversized blurred ellipses
  // drifting horizontally on offset timers (seamless ping-pong, no teleport).
  return (
    <g>
      <ellipse className="realm-fx fx-haze" cx={x} cy={y} rx={RX * 1.15} ry={RY * 0.7} fill={tint} opacity={op} filter="url(#tqWc)" style={{ animationDuration: `${dur}s` }} />
      <ellipse className="realm-fx fx-haze" cx={x + 12} cy={y + 8} rx={RX * 0.85} ry={RY * 0.55} fill={tint} opacity={op * 0.8} filter="url(#tqWc)" style={{ animationDuration: `${dur + 4}s`, animationDelay: `-${(dur / 2).toFixed(1)}s` }} />
    </g>
  )
}

function Lightning(): JSX.Element {
  // Subtle distant heat-lightning over the open NW sea — a soft pale flash, capped
  // low, infrequent (long cycle), reduce-motion-off. Reads as a far storm, not a strobe.
  return <ellipse className="realm-fx fx-bolt" cx={250} cy={140} rx={190} ry={80} fill="#d6e8ff" opacity={0} filter="url(#tqWc)" />
}

function Aurora(): JSX.Element {
  // Kept VERY faint + far out over the SE sea so it reads as a magical shimmer rather
  // than a literal night aurora (the map is a bright parchment day map).
  return <ellipse className="realm-fx fx-aurora" cx={1050} cy={730} rx={150} ry={34} fill="url(#fxAurora)" opacity={0.0} filter="url(#tqWc)" />
}

// ---- ambient sky ----------------------------------------------------------
function Clouds(): JSX.Element {
  const cl = [
    { x: 230, y: 95, r: 58, d: 78 },
    { x: 640, y: 72, r: 78, d: 104 },
    { x: 940, y: 110, r: 50, d: 88 }
  ]
  return (
    <g>
      {cl.map((c, i) => (
        <ellipse
          key={i}
          className="realm-fx fx-cloud"
          cx={c.x}
          cy={c.y}
          rx={c.r}
          ry={c.r * 0.4}
          fill="#ffffff"
          opacity={0.3}
          filter="url(#tqWc)"
          style={{ animationDuration: `${c.d}s`, animationDelay: `-${i * 18}s` }}
        />
      ))}
    </g>
  )
}

function Birds(): JSX.Element {
  // A small V-flock drifting across the sky (fade in/out at the ends → no teleport).
  const v = [
    [0, 6],
    [10, 2],
    [20, 6],
    [-10, 2],
    [-20, 6]
  ]
  return (
    <g className="realm-fx fx-birds">
      <g transform="translate(0 150)" fill="none" stroke="#4a4030" strokeWidth={2} strokeLinecap="round">
        {v.map(([dx, dy], i) => (
          <path key={i} d={`M${dx - 5} ${dy} Q${dx} ${dy - 5} ${dx + 5} ${dy}`} />
        ))}
      </g>
    </g>
  )
}

function Fireflies({ x, y, seed }: { x: number; y: number; seed: number }): JSX.Element {
  return (
    <g>
      {scatter(5, RX * 0.7, RY * 0.55, seed).map((p, i) => (
        <circle
          key={i}
          className="realm-fx fx-fly"
          cx={x + p.dx}
          cy={y + p.dy - 4}
          r={1.7}
          fill="#f7e08a"
          style={{ animationDelay: `-${(i * 0.8).toFixed(1)}s`, animationDuration: `${2.4 + (i % 3) * 0.9}s` }}
        />
      ))}
    </g>
  )
}

function Smoke({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <circle
          key={k}
          className="realm-fx fx-smoke"
          cx={x}
          cy={y}
          r={3.6}
          fill="#9a948a"
          opacity={0.5}
          style={{ animationDelay: `-${(k * 1.7).toFixed(1)}s`, animationDuration: '5.2s' }}
        />
      ))}
    </g>
  )
}

// ---- points of interest (inked, gains-only) -------------------------------
function Bonfire({ x, y }: { x: number; y: number }): JSX.Element {
  // The cozy "Bonfire that never goes out" — warmth, never a wildfire.
  return (
    <g>
      <ellipse className="realm-fx fx-glow" cx={x} cy={y - 4} rx={18} ry={14} fill="#ff9a3c" opacity={0.4} filter="url(#tqWc)" />
      {/* logs */}
      <g stroke="#6a4a2e" strokeWidth={2.4} strokeLinecap="round">
        <line x1={x - 9} y1={y + 3} x2={x + 9} y2={y - 1} />
        <line x1={x - 9} y1={y - 1} x2={x + 9} y2={y + 3} />
      </g>
      {/* flame */}
      <path className="realm-fx fx-flame" d={`M${x} ${y - 16} C ${x + 7} ${y - 8} ${x + 5} ${y - 1} ${x} ${y - 1} C ${x - 5} ${y - 1} ${x - 7} ${y - 8} ${x} ${y - 16} Z`} fill="#ff7a30" stroke="#d65a1e" strokeWidth={0.8} />
      <path d={`M${x} ${y - 11} C ${x + 3} ${y - 7} ${x + 2} ${y - 2} ${x} ${y - 2} C ${x - 2} ${y - 2} ${x - 3} ${y - 7} ${x} ${y - 11} Z`} fill="#ffd35a" />
      {/* embers */}
      {[0, 1].map((k) => (
        <circle key={k} className="realm-fx fx-ember" cx={x + (k ? 4 : -3)} cy={y - 4} r={1.3} fill="#ff9a4d" style={{ animationDelay: `-${k * 1.8}s` }} />
      ))}
    </g>
  )
}

function GemsMine({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g filter="url(#tqRough)">
      {/* mine entrance — timber A-frame into a slope */}
      <g transform={`translate(${x + 14} ${y + 2})`}>
        <path d="M-12 18 L-12 2 L0 -7 L12 2 L12 18 Z" fill="#3a2c1a" stroke={INK} strokeWidth={1.4} />
        <path d="M-12 2 L0 -7 L12 2" fill="none" stroke="#6a5a36" strokeWidth={2.6} />
        <rect x={-6} y={6} width={12} height={12} fill="#170f08" />
      </g>
      {/* gem cluster with a twinkling specular */}
      <g transform={`translate(${x - 14} ${y + 4})`}>
        <path d="M-9 5 L-3 -7 L6 -7 L11 5 L1 14 Z" fill="#9b6fd0" stroke="#5a3a86" strokeWidth={1.1} />
        <path d="M-3 -7 L1 5 L-9 5 Z" fill="#b58fe0" />
        <path d="M6 -7 L1 5 L11 5 Z" fill="#7e54b8" />
        <path d="M14 9 L18 0 L25 0 L29 9 L21 16 Z" fill="#3fcaa0" stroke="#2a8a6e" strokeWidth={1} />
        <circle className="realm-fx fx-twinkle" cx={-1} cy={-1} r={1.6} fill="#ffffff" />
      </g>
    </g>
  )
}

function Waterfall({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      {/* cliff face */}
      <path d={`M${x - 12} ${y - 18} L${x + 12} ${y - 18} L${x + 14} ${y + 18} L${x - 14} ${y + 18} Z`} fill="#a8b6a0" stroke={INK} strokeWidth={1.2} filter="url(#tqRough)" />
      {/* falling water */}
      <rect className="realm-fx fx-water" x={x - 5} y={y - 16} width={10} height={32} fill="url(#fxWater)" />
      <ellipse cx={x} cy={y + 17} rx={14} ry={4} fill="#dff0f0" opacity={0.7} filter="url(#tqWc)" />
    </g>
  )
}

function LighthouseBeam({ x, y }: { x: number; y: number }): JSX.Element {
  // The lighthouse landmark already exists at Tide's End — add only the sweeping beam.
  // The rotation pivots at the lamp (the polygon's left point) via fill-box origin.
  return (
    <polygon
      className="realm-fx fx-beam"
      points={`${x},${y} ${x + 120},${y - 26} ${x + 120},${y + 26}`}
      fill="url(#fxBeam)"
      opacity={0.5}
      style={{ transformBox: 'fill-box', transformOrigin: '0 50%' }}
    />
  )
}

function Mushrooms({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      <ellipse className="realm-fx fx-glow" cx={x} cy={y + 2} rx={16} ry={9} fill="#3fcaa0" opacity={0.32} filter="url(#tqWc)" />
      {[
        { dx: 0, s: 1 },
        { dx: 11, s: 0.78 },
        { dx: -10, s: 0.7 }
      ].map((m, i) => (
        <g key={i} transform={`translate(${x + m.dx} ${y}) scale(${m.s})`}>
          <path d="M-2 8 q2 -10 4 0 Z" fill="#e8e0cf" stroke={INK} strokeWidth={0.7} />
          <ellipse cx={0} cy={0} rx={8} ry={5} fill={i === 1 ? '#54d0c8' : '#3fcaa0'} stroke="#2a8a6e" strokeWidth={0.8} />
          <circle cx={-2} cy={-1} r={1} fill="#eafff6" />
        </g>
      ))}
    </g>
  )
}

function Ruins({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g fill="#b9a98a" stroke={INK} strokeWidth={1} filter="url(#tqRough)">
      <ellipse cx={x} cy={y + 10} rx={26} ry={6} fill="rgba(60,46,20,0.12)" stroke="none" />
      <rect x={x - 20} y={y - 8} width={6} height={18} rx={2} />
      <rect x={x - 7} y={y - 14} width={6} height={24} rx={2} />
      <rect x={x + 8} y={y - 10} width={6} height={20} rx={2} />
      <rect x={x - 3} y={y - 20} width={16} height={5} rx={2} />
    </g>
  )
}

function Shipwreck({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`} filter="url(#tqRough)">
      <path d="M-22 0 Q0 15 22 0 L17 8 Q0 17 -17 8 Z" fill="#6a4a2e" stroke="#3a2616" strokeWidth={1.3} />
      <path d="M0 0 L-3 -20" stroke="#3a2616" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-3 -20 L8 -13" stroke="#3a2616" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
}

function Windmill({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g filter="url(#tqRough)">
      <path d={`M${x - 9} ${y + 16} L${x - 6} ${y - 8} L${x + 6} ${y - 8} L${x + 9} ${y + 16} Z`} fill="#d8c8a0" stroke={INK} strokeWidth={1.2} />
      <rect x={x - 4} y={y + 4} width={8} height={12} fill="#3a2c1a" />
      <g className="realm-fx fx-mill" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <g transform={`translate(${x} ${y - 9})`} fill="#a88a4a" stroke={INK} strokeWidth={0.8}>
          <rect x={-2} y={-20} width={4} height={18} rx={1.5} />
          <rect x={2} y={-2} width={18} height={4} rx={1.5} />
          <rect x={-2} y={2} width={4} height={18} rx={1.5} />
          <rect x={-20} y={-2} width={18} height={4} rx={1.5} />
        </g>
      </g>
    </g>
  )
}

function SeasonTree({ x, y }: { x: number; y: number }): JSX.Element {
  // The gains-only "fire" reframe: a grove that cross-fades summer→autumn glow→spring
  // blossom — the "event" is the colour cycle and it always lands on MORE.
  return (
    <g filter="url(#tqRough)">
      <path d={`M${x} ${y + 14} v-12`} stroke="#6a5a36" strokeWidth={2.6} />
      <circle className="realm-fx fx-season" cx={x} cy={y - 6} r={14} fill="#74a84e" stroke="#4f7e3a" strokeWidth={1.2} />
    </g>
  )
}

export function MapEffects(): JSX.Element {
  const forests: [string, number][] = [
    ['embergreen', 0.2],
    ['larkholt', 0.5],
    ['rivenwood', 0.8],
    ['palevale', 0.35]
  ]
  return (
    <g className="realm-fx-layer" pointerEvents="none">
      <defs>
        <linearGradient id="fxWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaf6f6" />
          <stop offset="100%" stopColor="#bfe0e0" />
        </linearGradient>
        <linearGradient id="fxBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f7e08a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#f7e08a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fxAurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#50e6a0" stopOpacity="0" />
          <stop offset="50%" stopColor="#9678e6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#50e6a0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ---- GROUND points-of-interest (sit on the terrain) ---- */}
      <GemsMine x={C.crownspire.x} y={C.crownspire.y - 8} />
      <Waterfall x={C.crownspire.x - 70} y={C.crownspire.y + 70} />
      <LighthouseBeam x={C.tidesend.x} y={C.tidesend.y - 38} />
      <Mushrooms x={C.quietfens.x - 8} y={C.quietfens.y + 18} />
      <Mushrooms x={C.sunkenmarsh.x + 6} y={C.sunkenmarsh.y + 16} />
      <Ruins x={320} y={300} />
      <Shipwreck x={150} y={470} />
      <Windmill x={C.goldfield.x + 48} y={C.goldfield.y + 28} />
      <SeasonTree x={C.rivenwood.x + 44} y={C.rivenwood.y - 30} />
      <Bonfire x={C.embergreen.x} y={C.embergreen.y + 64} />

      {/* ---- chimney smoke over towns ---- */}
      <Smoke x={C.embergreen.x + 18} y={C.embergreen.y - 18} />
      <Smoke x={C.goldfield.x - 14} y={C.goldfield.y - 16} />
      <Smoke x={C.larkholt.x + 14} y={C.larkholt.y - 16} />

      {/* ---- biome weather ---- */}
      <Snow x={C.beyondveil.x} y={C.beyondveil.y} />
      <Rain x={C.goldfield.x} y={C.goldfield.y} />
      <Haze x={C.ashlands.x} y={C.ashlands.y} tint="#d8b86a" op={0.3} dur={10} />
      <Haze x={C.greymoor.x} y={C.greymoor.y} tint="#ffffff" op={0.3} dur={24} />
      <Haze x={C.quietfens.x} y={C.quietfens.y} tint="#eef4f0" op={0.26} dur={28} />
      <Haze x={C.hollowreach.x} y={C.hollowreach.y} tint="#ffffff" op={0.26} dur={26} />

      {/* ---- fireflies over forests ---- */}
      {forests.map(([id, seed]) => (
        <Fireflies key={id} x={C[id].x} y={C[id].y} seed={seed} />
      ))}

      {/* ---- sky ---- */}
      <Clouds />
      <Birds />
      <Lightning />
      <Aurora />
    </g>
  )
}
