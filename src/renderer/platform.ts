// OS detection for the renderer WITHOUT widening the preload/IPC bridge. In an
// Electron renderer, navigator.userAgent reliably carries the OS family
// ("Macintosh" on macOS, "Windows NT" on Windows), so a Mac-only UI tweak needs
// no new security surface. Used for: padding the custom title bar clear of the
// macOS traffic-light buttons, and hiding the Windows-only Active Mode tab.
export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)
