import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const aiService = env.AI_SERVICE_URL
  const recordsService = env.RECORDS_SERVICE_URL
  if (!aiService || !recordsService) {
    throw new Error('Set AI_SERVICE_URL and RECORDS_SERVICE_URL in the root .env file.')
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/ai-health': { target: aiService, changeOrigin: true, rewrite: () => '/health' },
        '/api/realtime': { target: aiService, changeOrigin: true, ws: true },
        '/api/call-records': { target: recordsService, changeOrigin: true },
        '/api/schedule-events': { target: recordsService, changeOrigin: true },
        '/api/schedule/extract': { target: aiService, changeOrigin: true },
        '/api/admin': { target: recordsService, changeOrigin: true },
        '/api/leads': { target: recordsService, changeOrigin: true },
      },
    },
  }
})
