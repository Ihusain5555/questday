// DEV-ONLY placeholder art for the INSIDE of each town. Imported from the gitignored
// dev folder (unconfirmed bundle license — never committed to the public repo).
//
// This module is referenced ONLY inside an `import.meta.env.DEV` branch in TownView, so
// production builds dead-code-eliminate that branch and tree-shake these imports out —
// the images (incl. the heavy greenhaven.png) never ship until licensing is cleared.
//
// Keyed by ATLAS region/town id (what TownView receives via `townId`). Per-town building
// placement / configuration is a LATER feature (a dev tool the user will drive); for now
// the whole interior is just this flat image.

import greenhaven from '../assets/dev/towns/greenhaven.png'
import goldfield from '../assets/dev/towns/goldfield.png'
import sunmeadow from '../assets/dev/towns/sunmeadow.png'
import larkholt from '../assets/dev/towns/larkholt.png'
import tidesend from '../assets/dev/towns/tidesend.png'
import greymoor from '../assets/dev/towns/greymoor.png'
import quietfens from '../assets/dev/towns/quietfens.png'
import goldport from '../assets/dev/towns/goldport.png'

export const TOWN_ART_IMG: Record<string, string> = {
  embergreen: greenhaven, // "Greenhaven"
  goldfield,
  sunmeadow,
  larkholt,
  tidesend, // shows "Tide's End.png"
  greymoor,
  quietfens,
  goldport, // shows "Goldport Harbor.png" (if/when the goldport town is entered)
}
