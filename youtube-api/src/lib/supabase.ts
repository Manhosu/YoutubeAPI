import { createClient } from '@supabase/supabase-js'

// Usar variáveis de ambiente para configurações com fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qzzzpcrvcsrmxfwnoqag.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6enpwY3J2Y3NybXhmd25vcWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzU2NzEsImV4cCI6MjA2MjY1MTY3MX0.HxgZNB3y65mDNVtDnJSDnnOdpCeuvBqlTs5OMFma9O0';

// Determinar a URL atual para o redirecionamento de forma dinâmica
const getSiteUrl = () => {
  // Em ambiente de navegador, SEMPRE usar a origem atual
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Para SSR, tentar usar variável de ambiente se disponível
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL;
  }
  
  // Último recurso para SSR
  return '';
};

// Garantir que siteUrl seja sempre a origem atual durante a execução no cliente
const siteUrl = getSiteUrl();

// Log completo para debug
console.log('=== Supabase Configuração ===');
console.log('URL:', supabaseUrl);
console.log('Site URL:', siteUrl);
console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'SSR');
console.log('Chave anônima válida:', supabaseAnonKey.length > 20 ? 'Sim (comprimento: '+supabaseAnonKey.length+')' : 'Não');

// Verificação de segurança antes de criar o cliente
if (!supabaseUrl) {
  console.error('ERRO: URL do Supabase não definida!');
}

if (!supabaseAnonKey) {
  console.error('ERRO: Chave anônima do Supabase não definida!');
}

// Configuração específica para autenticação
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('Erro ao acessar localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Erro ao salvar no localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Erro ao remover do localStorage:', error);
        }
      }
    }
  },
  global: {
    fetch: (...args) => {
      return fetch(...args);
    }
  }
})

// Verificar explicitamente a URL atual para tokens
if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
  console.log('Token detectado na URL, processando...');
  // Não precisamos fazer mais nada, o Supabase vai detectar o token automaticamente
  // devido à configuração detectSessionInUrl: true
}

export { supabase, siteUrl } 