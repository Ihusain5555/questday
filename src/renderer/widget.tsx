import React from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './widget/Widget'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'
import { applyStoredTheme, watchThemeChanges } from './theme'

// The floating widget is designed dark glass (it sits over the desktop) — keep dusk
// surfaces, but follow the accent so its brand glow matches the app.
applyStoredTheme({ allowLightTheme: false })
watchThemeChanges({ allowLightTheme: false })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="the widget">
      <Widget />
    </ErrorBoundary>
  </React.StrictMode>
)
