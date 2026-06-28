import React from 'react'
import { createRoot } from 'react-dom/client'
import { FrictionWindow } from './friction/FrictionWindow'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'
import { applyStoredTheme, watchThemeChanges } from './theme'

// Soft-friction popup: dark overlay by design — accent follows, surfaces stay dusk.
applyStoredTheme({ allowLightTheme: false })
watchThemeChanges({ allowLightTheme: false })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="this prompt">
      <FrictionWindow />
    </ErrorBoundary>
  </React.StrictMode>
)
