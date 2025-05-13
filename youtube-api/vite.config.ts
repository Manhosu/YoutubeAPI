import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5175,
    strictPort: false, // Permite tentar próxima porta disponível se 5175 estiver em uso
    host: true, // Expõe para conexões externas
    open: true, // Abre o navegador automaticamente
  },
  resolve: {
    alias: {
      // Add any required aliases here
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      }
    }
  }
})
