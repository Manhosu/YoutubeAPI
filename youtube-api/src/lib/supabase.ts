import { createClient } from '@supabase/supabase-js'

// Usar variáveis de ambiente para configurações com fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qzzzpcrvcsrmxfwnoqag.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6enpwY3J2Y3NybXhmd25vcWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzU2NzEsImV4cCI6MjA2MjY1MTY3MX0.HxgZNB3y65mDNVtDnJSDnnOdpCeuvBqlTs5OMFma9O0';

// Determinar a URL atual para o redirecionamento de forma dinâmica
const getSiteUrl = () => {
  // Se estamos no navegador, sempre usar a origem atual
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Se não estamos no navegador (SSR) e temos VITE_SITE_URL, usar isso
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL;
  }
  
  // Fallback para localhost durante o SSR quando não há outras informações
  return 'http://localhost:5175';
};

const siteUrl = getSiteUrl();

// Log completo para debug
console.log('=== Supabase Configuração ===');
console.log('URL:', supabaseUrl);
console.log('Site URL:', siteUrl);
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
    flowType: 'implicit'
  }
})

export { supabase, siteUrl } 