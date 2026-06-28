import React from 'react'
import { createRoot } from 'react-dom/client'
import { PrayerReminder } from './prayer/PrayerReminder'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'
import { applyStoredTheme, watchThemeChanges } from './theme'

// Full-screen prayer reminder: intentionally dark/atmospheric — accent follows only.
applyStoredTheme({ allowLightTheme: false })
watchThemeChanges({ allowLightTheme: false })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="this reminder">
      <PrayerReminder />
    </ErrorBoundary>
  </React.StrictMode>
)
