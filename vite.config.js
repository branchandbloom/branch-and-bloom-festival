import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the built app shell (JS/CSS/HTML/icons) so the gate app
      // still loads with zero signal. Firestore's own persistent cache
      // handles the data side, so we intentionally do NOT add runtime
      // caching rules for firestore.googleapis.com here — that's the SDK's
      // job and double-caching it can cause stale/conflicting state.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
        navigateFallback: '/index.html',
        // Never let workbox try to cache Firestore/Google API traffic
        navigateFallbackDenylist: [/^\/api\//],
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Branch & Bloom Festival Gate',
        short_name: 'Festival Gate',
        description: 'Gate check-in and door sales for the Branch & Bloom Flower Festival',
        theme_color: '#2d5a27',
        background_color: '#f9f6f0',
        display: 'standalone',
        start_url: '/gate',
        icons: []
      }
    })
  ],
})
