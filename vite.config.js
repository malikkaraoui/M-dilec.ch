import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id || !id.includes('node_modules')) return

          // React + router
          if (id.includes('/react-router-dom/') || id.includes('/react-router/')) return 'router'
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }

          // Firebase (garde un découpage lisible)
          if (id.includes('/firebase/auth') || id.includes('firebase/auth')) return 'firebase-auth'
          if (id.includes('/firebase/database') || id.includes('firebase/database')) return 'firebase-db'
          if (id.includes('/firebase/storage') || id.includes('firebase/storage')) return 'firebase-storage'
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase-core'

          // Le reste des deps
          return 'vendor'
        },
      },
    },
  },
})