import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5300,  // 使用5300端口
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
