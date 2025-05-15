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

// Configuração do cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'youtube_analyzer_auth',
    flowType: 'pkce',
    debug: import.meta.env.DEV // Ativar debug apenas em desenvolvimento
  },
  global: {
    headers: {
      'X-Client-Info': 'youtube-analyzer'
    }
  },
  // Desativar o retorno automático em caso de perda de conexão
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
})

// Verificar o estado da autenticação no console durante o desenvolvimento
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Supabase Auth Event:', event);
    console.log('Session:', session ? 'Disponível' : 'Nula');
    if (session?.provider_token) {
      console.log('Provider token está disponível');
    }
  });
}

export { supabase, siteUrl } 