import React from 'react'
import { createRoot } from 'react-dom/client'
import { FrictionWindow } from './friction/FrictionWindow'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FrictionWindow />
  </React.StrictMode>
)
