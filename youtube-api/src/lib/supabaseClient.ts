import { createClient } from '@supabase/supabase-js'

// CORREÇÃO: Usar explicitamente o URL correto para evitar problemas de digitação
const supabaseUrl = 'https://qzzzpcrvcsrmxfwnoqag.supabase.co'
// Certifique-se de que a chave anônima esteja carregada corretamente
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6enpwY3J2Y3NybXhmd25vcWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzU2NzEsImV4cCI6MjA2MjY1MTY3MX0.HxgZNB3y65mDNVtDnJSDnnOdpCeuvBqlTs5OMFma9O0"

// Log completo para debug
console.log('=== Supabase Configuração ===');
console.log('URL:', supabaseUrl);
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

export { supabase } 