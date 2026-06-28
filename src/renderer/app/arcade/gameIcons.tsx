// Arcade icon system — crisp Phosphor glyphs replace the old emoji (app-wide
// icon convention, post-v1.7). Each game stores a Phosphor icon NAME + a
// skill-domain colour token in balance.arcade.games; here we map the name to a
// component and render it either bare (tinted) or in a soft tinted tile that
// mirrors the Eisenhower `.eh-badge` look. One registry = one place to audit
// which icons the bundle pulls in.
import {
  Stack,
  Stairs,
  Cards,
  Eye,
  Crosshair,
  Lightning,
  Palette,
  Eyedropper,
  HandPalm,
  ArrowsLeftRight,
  ArrowsClockwise,
  GameController,
  // Memory Match card faces — distinct shapes so you recall by shape (and
  // position), not colour; all drawn in one treasure-gold tone (see CSS).
  Crown,
  Diamond,
  Rocket,
  Anchor,
  Heart,
  Moon,
  Sun,
  Leaf,
  Bell,
  Key,
  Planet,
  Compass,
  Star,
  Cloud,
  Cube,
  Flower,
  Fish,
  Gift,
  type Icon,
  type IconWeight
} from '@phosphor-icons/react'
import { balance } from '@shared/config/balance'

export type ArcadeKey = keyof typeof balance.arcade.games

/** Phosphor icon NAME (stored in balance.arcade.games[k].icon) -> component. */
const ICONS: Record<string, Icon> = {
  Stack,
  Stairs,
  Cards,
  Eye,
  Crosshair,
  Lightning,
  Palette,
  Eyedropper,
  HandPalm,
  ArrowsLeftRight,
  ArrowsClockwise
}

export function gameIconFor(k: ArcadeKey): Icon {
  return ICONS[balance.arcade.games[k].icon] ?? GameController
}

/** The bare game glyph, tinted with its skill-domain colour (inline style so the
 *  CSS var resolves; the icon paints with currentColor). */
export function GameIcon({
  k,
  size = 16,
  weight = 'fill'
}: {
  k: ArcadeKey
  size?: number
  weight?: IconWeight
}): JSX.Element {
  const I = gameIconFor(k)
  return <I size={size} weight={weight} style={{ color: balance.arcade.games[k].color }} />
}

/** The glyph in a soft tile tinted with its skill-domain colour (`--game`,
 *  set inline). `lg` = the big tile that sits atop each arcade card. */
export function GameBadge({
  k,
  size = 18,
  lg = false
}: {
  k: ArcadeKey
  size?: number
  lg?: boolean
}): JSX.Element {
  const I = gameIconFor(k)
  return (
    <span
      className={'arcade-badge' + (lg ? ' lg' : '')}
      style={{ ['--game' as string]: balance.arcade.games[k].color }}
    >
      <I size={size} weight="fill" />
    </span>
  )
}

/** Memory Match deck faces — 12 distinct, recognisable shapes. The card stores
 *  the face index; matching compares indices; the face renders in gold (CSS). */
const MEMORY_FACES: Icon[] = [
  Crown,
  Diamond,
  Rocket,
  Anchor,
  Heart,
  Moon,
  Sun,
  Leaf,
  Bell,
  Key,
  Planet,
  Compass,
  Star,
  Cloud,
  Cube,
  Flower,
  Fish,
  Gift
]
export const MEMORY_FACE_COUNT = MEMORY_FACES.length

/** A Memory-Match card face. `color` (v1.13) tints the glyph so the board is vivid —
 *  each face carries its own signature colour, set by the caller. */
export function MemoryFace({
  face,
  size = 30,
  color
}: {
  face: number
  size?: number
  color?: string
}): JSX.Element {
  const I = MEMORY_FACES[face % MEMORY_FACES.length]
  return <I size={size} weight="fill" style={color ? { color } : undefined} />
}
