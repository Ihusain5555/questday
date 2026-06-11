import React from 'react'
import { createRoot } from 'react-dom/client'
import { FrictionWindow } from './friction/FrictionWindow'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="this prompt">
      <FrictionWindow />
    </ErrorBoundary>
  </React.StrictMode>
)
