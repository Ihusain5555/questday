/// <reference types="vite/client" />
import type { QuestDayApi } from '../preload'

declare global {
  interface Window {
    questday: QuestDayApi
  }
  /** App version, injected at build time from package.json (see electron.vite.config.ts). */
  const __APP_VERSION__: string
}

export {}
