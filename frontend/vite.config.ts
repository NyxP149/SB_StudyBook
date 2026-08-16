import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'StudyBook',
        short_name: 'StudyBook',
        description: "Transforme un discours (audio, texte) en note d'étude structurée.",
        theme_color: '#241d16',
        background_color: '#f6f0e3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Sans ça, recharger la page hors ligne renvoie l'erreur réseau du
        // navigateur au lieu de resservir l'app (React Router gère ensuite
        // la route côté client une fois le JS chargé).
        navigateFallback: '/index.html',
        // Notes/dossiers/templates/étude personnelle restent lisibles hors
        // ligne une fois consultés une première fois. Tout le reste (auth,
        // création de note, etc.) n'est volontairement pas mis en cache :
        // ça ne fonctionne de toute façon pas sans connexion au backend.
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && /\/api\/(notes|folders|templates|study)(\/|$|\?)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'studybook-api-cache' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
