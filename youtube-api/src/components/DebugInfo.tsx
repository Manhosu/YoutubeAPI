import React, { useState } from 'react';
import { siteUrl } from '../lib/supabase';

// Valores a serem mostrados no componente de debug
interface DebugEnvironment {
  supabaseUrl: string;
  siteUrl: string;
  authSiteUrl: string;
  hasSupabaseKey: boolean;
  origin: string;
  fullUrl: string;
  pathname: string;
  environment: string;
}

const DebugInfo: React.FC = () => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  
  // Extrair informações do ambiente
  const envInfo: DebugEnvironment = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '[não definido]',
    siteUrl: import.meta.env.VITE_SITE_URL || '[não definido]',
    authSiteUrl: siteUrl, // URL que está sendo usada para autenticação
    hasSupabaseKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    origin: typeof window !== 'undefined' ? window.location.origin : '[servidor]',
    fullUrl: typeof window !== 'undefined' ? window.location.href : '[servidor]',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '[servidor]',
    environment: import.meta.env.DEV ? 'development' : 'production'
  };

  return (
    <div className="fixed bottom-5 right-5">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
      >
        {showDetails ? 'Ocultar Detalhes' : 'Debug Info'}
      </button>

      {showDetails && (
        <div className="bg-gray-900 text-white p-4 rounded-md mt-2 border border-red-500 w-96">
          <h3 className="text-lg font-bold mb-2">Informações de Debug</h3>
          
          <div className="mb-3">
            <p className="font-medium">URL Supabase:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.supabaseUrl}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Site URL (config):</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.siteUrl}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">URL usada para Auth:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.authSiteUrl}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Origin Atual:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.origin}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">URL Completa:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.fullUrl}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Caminho Atual:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.pathname}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Ambiente:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.environment}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Chave Anônima:</p>
            <p className="text-xs bg-gray-800 p-1 rounded">
              {envInfo.hasSupabaseKey ? '✓ Definida' : '✗ Não definida'}
            </p>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Se os valores acima estiverem incorretos, verifique se a detecção automática está funcionando.
          </p>
        </div>
      )}
    </div>
  );
};

export default DebugInfo; 