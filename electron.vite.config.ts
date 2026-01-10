import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Plugin to remove source map comments from CSS files
function removeSourceMapComments(): Plugin {
  return {
    name: 'remove-sourcemap-comments',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('.css') && code.includes('sourceMappingURL')) {
        return code.replace(/\/\*#\s*sourceMappingURL=[^\s]+\s*\*\//g, '')
      }
      return null
    }
  }
}

export default defineConfig({
  main: {
    build: {
      // Externalize all dependencies including better-sqlite3 (native module)
      externalizeDeps: true
    },
    // Ensure environment variables are available in main process
    define: {
      'process.env.VITE_EDITION': JSON.stringify(process.env.VITE_EDITION || 'release'),
      'process.env.VITE_TRIAL_DURATION': JSON.stringify(process.env.VITE_TRIAL_DURATION || '5'),
      'process.env.VITE_TRIAL_UNIT': JSON.stringify(process.env.VITE_TRIAL_UNIT || 'minutes'),
      'process.env.VITE_ACTIVATION_CODE': JSON.stringify(process.env.VITE_ACTIVATION_CODE || ''),
      'process.env.VITE_ENABLE_DEVTOOLS': JSON.stringify(
        process.env.VITE_ENABLE_DEVTOOLS || 'false'
      )
    }
  },
  preload: {
    build: {
      externalizeDeps: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), removeSourceMapComments()],
    css: {
      devSourcemap: false
    },
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      exclude: []
    }
  }
})
