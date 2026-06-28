import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'
import { applyStoredTheme, watchThemeChanges } from './theme'

// Set the theme/accent attribute BEFORE first paint (no flash), then keep it live.
applyStoredTheme()
watchThemeChanges()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="QuestDay">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
