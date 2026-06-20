// DEV-ONLY placeholder art for the INSIDE of each town — keyed by ATLAS region/town id.
//
// The actual images live in a GITIGNORED dev folder (`assets/dev/towns/*.png`,
// unconfirmed bundle license — never committed to the public repo). They were imported
// statically here, but an asset import is treated as side-effectful, so Rollup did NOT
// tree-shake them out of production even though TownView only reads this map inside an
// `import.meta.env.DEV` branch. That meant production builds (a) shipped the unlicensed
// images in the installer and (b) broke the macOS cloud build (the gitignored files are
// absent on a fresh checkout: "Could not resolve ../assets/dev/towns/greenhaven.png").
//
// The town INTERIOR is gated behind the Realm "Coming Soon" placeholder for now, so this
// map is intentionally EMPTY — production depends on no dev assets, and nothing
// user-facing is lost. To use the placeholders again locally, restore the per-town
// `import … from '../assets/dev/towns/<id>.png'` lines and map them below (the realm must
// be un-gated to reach the town interior). Keep this map empty for any shipped build until
// the art licensing is cleared.
export const TOWN_ART_IMG: Record<string, string> = {}
