import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para copiar o index.html para a pasta auth/callback
function copyIndexToAuthCallback() {
  const distDir = path.join(__dirname, 'dist');
  const authCallbackDir = path.join(distDir, 'auth', 'callback');
  
  // Verificar se o diretório dist existe
  if (!fs.existsSync(distDir)) {
    console.error('Diretório dist não encontrado!');
    return;
  }
  
  // Criar diretórios auth/callback se não existirem
  if (!fs.existsSync(path.join(distDir, 'auth'))) {
    fs.mkdirSync(path.join(distDir, 'auth'));
  }
  
  if (!fs.existsSync(authCallbackDir)) {
    fs.mkdirSync(authCallbackDir);
  }
  
  // Copiar index.html para auth/callback
  try {
    fs.copyFileSync(
      path.join(distDir, 'index.html'),
      path.join(authCallbackDir, 'index.html')
    );
    console.log('index.html copiado para auth/callback com sucesso!');
  } catch (error) {
    console.error('Erro ao copiar index.html:', error);
  }
}

// Executar a função
copyIndexToAuthCallback(); 