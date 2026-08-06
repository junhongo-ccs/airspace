import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: [
      'airspace-viewer-react.onrender.com',
      'localhost',
      '127.0.0.1',
    ],
  },
})
