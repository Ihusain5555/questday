import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const sharedAlias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@renderer': resolve(__dirname, 'src/renderer')
}

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: { alias: sharedAlias },
    // Bake the app version (from package.json — single source of truth) into the
    // renderer bundle so the title bar can show it without an IPC round-trip.
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          widget: resolve(__dirname, 'src/renderer/widget.html'),
          friction: resolve(__dirname, 'src/renderer/friction.html'),
          prayer: resolve(__dirname, 'src/renderer/prayer.html')
        }
      }
    }
  }
})
