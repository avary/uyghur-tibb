import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vue app entry. The API stays at the existing single-origin /api/students
// path: in dev, browsers hit this dev server and we proxy to the Node API
// (node dev.js) server-side, so the browser never sees a cross-origin request.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Vite dev -> existing API (run `npm run dev` in the repo root).
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Keep the locally imported recipe book isolated from the application
    // runtime so normal UI changes do not invalidate this large cacheable chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          recipeData: ['./src/data/recipeData.js']
        }
      }
    }
  }
})
