import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  authRedirectUrl: string;
}

const DebugInfo: React.FC = () => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const { user } = useAuth();
  
  // Obter a URL atual que será usada para autenticação
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const authRedirectUrl = `${currentUrl}/auth/callback`;
  
  // Extrair informações do ambiente
  const envInfo: DebugEnvironment = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '[não definido]',
    siteUrl: import.meta.env.VITE_SITE_URL || '[não definido]',
    authSiteUrl: currentUrl,
    hasSupabaseKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    origin: typeof window !== 'undefined' ? window.location.origin : '[servidor]',
    fullUrl: typeof window !== 'undefined' ? window.location.href : '[servidor]',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '[servidor]',
    environment: import.meta.env.DEV ? 'development' : 'production',
    authRedirectUrl: authRedirectUrl
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="flex gap-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
        >
          {showDetails ? 'Ocultar Detalhes' : 'Debug Info'}
        </button>
        
        <button 
          className={`py-2 px-4 rounded-md text-white ${user ? 'bg-green-600' : 'bg-yellow-600'}`}
          title={user ? 'Autenticado' : 'Não autenticado'}
        >
          {user ? '✓ Auth' : '✗ Auth'}
        </button>
      </div>

      {showDetails && (
        <div className="bg-gray-900 text-white p-4 rounded-md mt-2 border border-red-500 w-96 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-bold mb-2">Informações de Debug</h3>
          
          <div className="mb-3">
            <div className="flex justify-between items-center">
              <p className="font-medium">Status Auth:</p>
              <span 
                className={`text-xs px-2 py-1 rounded ${user ? 'bg-green-600' : 'bg-yellow-600'}`}
              >
                {user ? 'Autenticado' : 'Não autenticado'}
              </span>
            </div>
            {user && (
              <p className="text-xs mt-1 text-gray-400">
                ID: {user.id.substring(0, 8)}...
              </p>
            )}
          </div>

          <div className="mb-3">
            <div className="flex justify-between">
              <p className="font-medium">URL usada para Auth:</p>
              <button 
                className="text-xs bg-blue-700 px-1 rounded"
                onClick={() => copyToClipboard(envInfo.authSiteUrl)}
                title="Copiar para área de transferência"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.authSiteUrl}
            </p>
          </div>

          <div className="mb-3">
            <div className="flex justify-between">
              <p className="font-medium">Redirect Auth:</p>
              <button 
                className="text-xs bg-blue-700 px-1 rounded"
                onClick={() => copyToClipboard(envInfo.authRedirectUrl)}
                title="Copiar para área de transferência"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.authRedirectUrl}
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
            <p className="font-medium">Ambiente:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.environment}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Site URL (config):</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.siteUrl}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">URL Supabase:</p>
            <p className="text-xs bg-gray-800 p-1 rounded overflow-x-auto">
              {envInfo.supabaseUrl}
            </p>
          </div>

          <div className="mb-3">
            <p className="font-medium">Chave Anônima:</p>
            <p className="text-xs bg-gray-800 p-1 rounded">
              {envInfo.hasSupabaseKey ? '✓ Definida' : '✗ Não definida'}
            </p>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Autenticação usará sempre o URL atual do navegador.
          </p>
        </div>
      )}
    </div>
  );
};

export default DebugInfo; 