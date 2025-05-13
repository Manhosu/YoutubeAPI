import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carregar env files com base no modo
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
    ],
    define: {
      // Garantir que variáveis de ambiente estejam disponíveis
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://qzzzpcrvcsrmxfwnoqag.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6enpwY3J2Y3NybXhmd25vcWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzU2NzEsImV4cCI6MjA2MjY1MTY3MX0.HxgZNB3y65mDNVtDnJSDnnOdpCeuvBqlTs5OMFma9O0'),
      'import.meta.env.VITE_SITE_URL': JSON.stringify(env.VITE_SITE_URL || '')
    },
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
    },
    build: {
      outDir: 'dist',
      sourcemap: true, // Adicionar sourcemaps para depuração mais fácil
      rollupOptions: {
        output: {
          manualChunks: {
            'supabase': ['@supabase/supabase-js']
          }
        }
      }
    }
  }
})
