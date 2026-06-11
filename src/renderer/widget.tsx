import React from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './widget/Widget'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="the widget">
      <Widget />
    </ErrorBoundary>
  </React.StrictMode>
)
