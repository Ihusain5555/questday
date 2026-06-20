// Temporary feature gates (UI-only). The Realm / civilization reward layer is hidden
// behind a "Coming Soon" placeholder until it's ready to ship. IMPORTANT: only the UI
// surfaces are gated — the reward ENGINE keeps running silently (expeditions, chronicle,
// civilization growth are still computed from completions), so ↩ Restore stays EXACT and
// nothing is lost. Flip this to `false` to re-open the realm everywhere at once (the Realm
// tab map, the Dashboard peek, and the completion-celebration expedition/civ lines).
// Typed `boolean` (not the literal `true`) on purpose: an early `return` guarded by a
// literal-true const would make the real Realm render below it unreachable code (tsc /
// lint noise). As a plain boolean, both branches stay reachable to the type-checker.
export const REALM_COMING_SOON: boolean = true
