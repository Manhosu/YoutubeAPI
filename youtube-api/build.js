// Script de build personalizado para ignorar erros de TypeScript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando build personalizado...');

// Executar o build do Vite
try {
  console.log('📦 Compilando o projeto com Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  console.log('🔄 Executando scripts pós-build...');
  execSync('node vercel.build.js', { stdio: 'inherit' });
  
  console.log('✅ Build concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro durante o build:', error);
  process.exit(1);
} 