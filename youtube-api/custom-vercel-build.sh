#!/bin/bash

# Executar o build normal
npm run build

# Garantir que o index.html seja copiado para diretórios de rota para SPA
mkdir -p dist/auth/callback
cp dist/index.html dist/auth/callback/index.html

# Mensagem de confirmação
echo "Build concluído com sucesso e arquivos copiados para rotas SPA." 