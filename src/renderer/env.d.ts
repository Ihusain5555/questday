/// <reference types="vite/client" />
import type { QuestDayApi } from '../preload'

declare global {
  interface Window {
    questday: QuestDayApi
  }
}

export {}
