import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/realtime': 'http://127.0.0.1:8001',
      '/api/call-records': 'http://127.0.0.1:8000',
      '/api/admin': 'http://127.0.0.1:8000',
      '/api/leads': 'http://127.0.0.1:8000',
    },
  },
})
