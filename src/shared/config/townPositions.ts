// Where each of the 15 realm regions sits on the FLAT overworld image, authored by hand
// with the dev-only TownPlacer tool (src/renderer/app/TownPlacer.tsx).
//
// Values are NORMALIZED fractions of the image so they stay aligned at any display size:
//   x, y = the marker CENTER as a fraction of image width/height (0..1)
//   r     = the hover-circle radius as a fraction of image WIDTH (the art is square 1024×1024)
//
// DESIGN NOTE (for the marker/label feature): render each town's NAME label BELOW its
// radius circle — never inside it.
//
// NOTE: this is just authored DATA — it is NOT wired into the app yet. The next feature
// ("click a town on the map → open its inside-page") will read TOWN_POSITIONS to draw the
// hover circles and route a click to onEnterTown(id). `id` matches the ATLAS region ids in
// src/shared/config/balance.ts, which is exactly what onEnterTown(id) already expects.

export type TownPosition = { id: string; name: string; x: number; y: number; r: number }

export const TOWN_POSITIONS: TownPosition[] = [
  { id: 'embergreen', name: 'Greenhaven', x: 0.5279, y: 0.4966, r: 0.1 },
  { id: 'goldfield', name: 'Goldfield March', x: 0.7601, y: 0.4799, r: 0.09 },
  { id: 'sunmeadow', name: 'Sunmeadow Hold', x: 0.435, y: 0.2167, r: 0.045 },
  { id: 'larkholt', name: 'Larkholt', x: 0.4969, y: 0.1579, r: 0.04 },
  { id: 'tidesend', name: "Tide's End", x: 0.4892, y: 0.3282, r: 0.0657 },
  { id: 'crownspire', name: 'Crownspire Peaks', x: 0.7539, y: 0.1889, r: 0.095 },
  { id: 'rivenwood', name: 'Rivenwood Reach', x: 0.2895, y: 0.7152, r: 0.105 },
  { id: 'palevale', name: 'Pale Vale', x: 0.3344, y: 0.4489, r: 0.1 },
  { id: 'greymoor', name: 'Greymoor', x: 0.7152, y: 0.6966, r: 0.085 },
  { id: 'quietfens', name: 'Quiet Fens', x: 0.5062, y: 0.726, r: 0.07 },
  { id: 'mistisles', name: 'Mist Isles', x: 0.8669, y: 0.5882, r: 0.07 },
  { id: 'hollowreach', name: 'Hollow Reach', x: 0.1285, y: 0.4675, r: 0.05 },
  { id: 'sunkenmarsh', name: 'Sunken Marsh', x: 0.5573, y: 0.6393, r: 0.0377 },
  { id: 'ashlands', name: 'The Ashlands', x: 0.7136, y: 0.3127, r: 0.0744 },
  { id: 'beyondveil', name: 'Beyond the Veil', x: 0.2972, y: 0.13, r: 0.0404 },
]
