import { createClient } from '@supabase/supabase-js'

// Usar variáveis de ambiente para configurações
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Determinar a URL atual para o redirecionamento
const siteUrl = import.meta.env.VITE_SITE_URL || 
                window.location.origin ||
                'http://localhost:5173';

// Log completo para debug
console.log('=== Supabase Configuração ===');
console.log('URL:', supabaseUrl);
console.log('Site URL:', siteUrl);
console.log('Chave anônima válida:', supabaseAnonKey.length > 20 ? 'Sim (comprimento: '+supabaseAnonKey.length+')' : 'Não');

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