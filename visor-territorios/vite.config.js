import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/pwa/',
  server: {
    proxy: {
      '/kml': {
        target: 'https://territorios-87a96.web.app',
        changeOrigin: true
      },
//      '/mapas': {
//        target: 'https://territorios-87a96.web.app',
//        changeOrigin: true
//      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pwa-icon.png'],
      manifest: {
        name: 'Visor Territorios',
        short_name: 'Visor',
        description: 'Visualizador dinámico de territorios PWA',
        theme_color: '#1e293b',
        background_color: '#1e293b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
