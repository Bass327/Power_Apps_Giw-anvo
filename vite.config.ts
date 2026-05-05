import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { powerApps } from '@microsoft/power-apps-vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    powerApps(),
    basicSsl(), // certificat auto-signé → HTTPS sur le réseau local
  ],
  build: {
    // Désactive le base64 inline des assets (images, polices).
    // Sans ça, les petits fichiers sont encodés en data: URL,
    // ce qui peut être bloqué par le CSP de Power Apps.
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // écoute sur 0.0.0.0 → accessible sur le réseau local (WiFi)
    headers: {
      // Nécessaire pour que le popup MSAL puisse détecter sa fermeture
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
})
