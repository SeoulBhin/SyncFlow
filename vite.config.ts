import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 대용량 vendor 라이브러리를 별도 청크로 분리. 한 청크 4.7MB → 다수의 작은 청크.
    // 효과: 초기 로드 병렬화, 자주 안 바뀌는 vendor 청크는 브라우저 캐시 hit 률 상승.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return
          if (id.includes('monaco-editor')) return 'monaco'
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'tiptap'
          if (id.includes('livekit-client') || id.includes('@livekit')) return 'livekit'
          if (
            id.includes('/yjs/') ||
            id.includes('@hocuspocus') ||
            id.includes('y-prosemirror') ||
            id.includes('y-monaco') ||
            id.includes('y-protocols') ||
            id.includes('y-websocket')
          ) return 'yjs'
          if (id.includes('react-router')) return 'react-router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
          if (id.includes('lowlight') || id.includes('highlight.js')) return 'lowlight'
          if (id.includes('lucide-react')) return 'icons'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/code-runs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
