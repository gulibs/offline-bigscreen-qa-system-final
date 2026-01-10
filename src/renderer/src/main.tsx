import './assets/main.css'

// Import console control - must be imported before any console calls
import './utils/consoleControl'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'

// 防止 Esc 键退出全屏（生产环境）
if (import.meta.env.PROD) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
    }
  })
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

console.log('[Main.tsx] Root element found, creating React root...')
console.log('[Main.tsx] Current window location:', window.location.href)
console.log('[Main.tsx] Current window pathname:', window.location.pathname)
console.log('[Main.tsx] Current window hash:', window.location.hash)

// With HashRouter, we don't need to fix pathname
// HashRouter uses hash (#) for routing, which works reliably with file:// protocol
// Initial route will be '/' (empty hash) or '#/'
console.log('[Main.tsx] Using HashRouter - no pathname fixing needed')
console.log('[Main.tsx] Current window location:', window.location.href)
console.log('[Main.tsx] Current window hash:', window.location.hash)

const root = createRoot(rootElement)

console.log('[Main.tsx] Rendering React app with HashRouter...')

root.render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)

console.log('[Main.tsx] React app rendered')

// With HashRouter, routes are in the hash, not pathname
// No need to fix pathname

// Notify main process when React app is ready (production only)
if (import.meta.env.PROD && window.api?.notifyAppReady) {
  // Wait for React to fully render and mount
  // Use multiple requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Additional check: ensure HomePage is actually rendered
      setTimeout(() => {
        const homeButtons = document.querySelectorAll('[data-home-button]')
        console.log('[Main] Home buttons found:', homeButtons.length)
        if (window.api?.notifyAppReady) {
          window.api.notifyAppReady()
        }
      }, 300) // Give React more time to render
    })
  })
}
