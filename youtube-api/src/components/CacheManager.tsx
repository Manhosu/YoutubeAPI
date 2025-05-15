import { useState } from 'react';
import { youtubeService } from '../services/youtubeService';

interface CacheManagerProps {
  className?: string;
}

const CacheManager = ({ className = '' }: CacheManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const handleClearCache = () => {
    try {
      youtubeService.clearCache();
      setMessage('Cache limpo com sucesso. Os dados serão recarregados na próxima requisição.');
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage('Erro ao limpar cache.');
      setTimeout(() => setMessage(null), 5000);
    }
  };
  
  const handlePersistCache = () => {
    try {
      youtubeService.persistCache();
      setMessage('Cache salvo com sucesso.');
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage('Erro ao salvar cache.');
      setTimeout(() => setMessage(null), 5000);
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
        title="Gerenciar cache"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
        <span className="hidden md:inline">Cache</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 p-3">
          <h3 className="text-sm font-medium text-white mb-2">Gerenciador de Cache</h3>
          <p className="text-xs text-gray-400 mb-3">
            O cache ajuda a reduzir o uso de quotas da API do YouTube. Limpe-o apenas se estiver tendo problemas.
          </p>
          
          <div className="flex flex-col space-y-2">
            <button 
              onClick={handleClearCache}
              className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 py-1 px-3 rounded transition-colors"
            >
              Limpar Cache
            </button>
            <button 
              onClick={handlePersistCache}
              className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-1 px-3 rounded transition-colors"
            >
              Salvar Cache Manualmente
            </button>
          </div>
          
          {message && (
            <div className="mt-2 text-xs p-2 bg-gray-700/50 rounded">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CacheManager; 