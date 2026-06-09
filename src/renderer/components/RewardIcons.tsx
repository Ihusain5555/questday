/**
 * Bespoke reward-economy glyphs (coin, streak flame, level star). Unlike flat
 * monochrome icons, these use multi-stop gradients + a gloss highlight + a darker
 * rim for real depth — the "premium game reward icon" look. Pure SVG, crisp at
 * any size, themed to the Clay Fantasy gold palette.
 */

/** Gold coin with a sparkle emblem, glossy highlight, and a darker rim. */
export function CoinIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="qd-coin-face" cx="38%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#fff0b8" />
          <stop offset="48%" stopColor="#f8bb3c" />
          <stop offset="100%" stopColor="#cc861c" />
        </radialGradient>
        <linearGradient id="qd-coin-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6c860" />
          <stop offset="100%" stopColor="#a86c14" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#qd-coin-rim)" />
      <circle cx="12" cy="12" r="9" fill="url(#qd-coin-face)" />
      {/* embossed sparkle */}
      <path
        d="M12 5.6 L13.5 10.5 L18.4 12 L13.5 13.5 L12 18.4 L10.5 13.5 L5.6 12 L10.5 10.5 Z"
        fill="#bd7c18"
        opacity="0.45"
      />
      {/* gloss */}
      <ellipse cx="8.7" cy="8" rx="3.1" ry="2" fill="#ffffff" opacity="0.4" />
    </svg>
  )
}

/** Two-layer flame (hot orange shell, bright yellow core) with a glow. */
export function FlameIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="qd-flame-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb43a" />
          <stop offset="45%" stopColor="#ff6a2b" />
          <stop offset="100%" stopColor="#e23418" />
        </linearGradient>
        <linearGradient id="qd-flame-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe96a" />
          <stop offset="100%" stopColor="#ff902b" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.6 C 14 6 17 8 17 13 C 17 16.9 14.8 20.4 12 20.4 C 9.2 20.4 7 16.9 7 13 C 7 10.4 8.6 9.4 9.3 7.5 C 9.9 9 10.9 9.3 11.1 8 C 11.4 5.7 11 3.4 12 1.6 Z"
        fill="url(#qd-flame-outer)"
      />
      <path
        d="M12 8.4 C 13.3 10.6 14.6 11.6 14.6 14.2 C 14.6 16.5 13.4 18.3 12 18.3 C 10.6 18.3 9.4 16.7 9.4 14.4 C 9.4 12.8 10.4 12.4 10.8 11 C 11.2 11.9 11.7 11.7 12 8.4 Z"
        fill="url(#qd-flame-core)"
      />
    </svg>
  )
}

/** Glossy five-point star badge with the level number embossed inside. */
export function StarBadge({ level, size = 64 }: { level: number; size?: number }): JSX.Element {
  return (
    <svg
      className="level-star"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Level ${level}`}
    >
      <defs>
        <radialGradient id="qd-star-gold" cx="50%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffe89a" />
          <stop offset="52%" stopColor="#ffc23e" />
          <stop offset="100%" stopColor="#df8e18" />
        </radialGradient>
      </defs>
      <path
        d="M 50 2 L 62.9 32.2 L 95.6 35.2 L 70.9 56.8 L 78.2 88.8 L 50 72 L 21.8 88.8 L 29.1 56.8 L 4.4 35.2 L 37.1 32.2 Z"
        fill="url(#qd-star-gold)"
        stroke="#a8640e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* gloss highlight on the upper body */}
      <ellipse cx="50" cy="33" rx="15" ry="7.5" fill="#ffffff" opacity="0.28" />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontSize={String(level).length > 2 ? 24 : 30}
        fontWeight="800"
        fill="#5a3406"
      >
        {level}
      </text>
    </svg>
  )
}
