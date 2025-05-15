import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMultiAccount, type GoogleAccount } from '../contexts/MultiAccountContext';
import { youtubeService, type YoutubeChannel } from '../services/youtubeService';

interface MultiChannelGridProps {
  onChannelSelect?: (channel: YoutubeChannel, accountId: string) => void;
}

// Interface para o canal com informações adicionais
interface ChannelWithAccount extends YoutubeChannel {
  accountId: string;
  accountName: string;
  accountEmail: string;
}

const MultiChannelGrid = ({ onChannelSelect }: MultiChannelGridProps) => {
  const { accounts } = useMultiAccount();
  const [channels, setChannels] = useState<ChannelWithAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Carregar canais de todas as contas
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const channelsWithAccounts: ChannelWithAccount[] = [];
        
        // Para cada conta, buscar seus canais
        for (const account of accounts) {
          try {
            const accountChannels = await youtubeService.getMyChannels(account.id, account.providerToken);
            
            // Adicionar informações da conta a cada canal
            const channelsWithAccountInfo = accountChannels.map(channel => ({
              ...channel,
              accountId: account.id,
              accountName: account.displayName,
              accountEmail: account.email
            }));
            
            channelsWithAccounts.push(...channelsWithAccountInfo);
          } catch (err) {
            console.error(`Erro ao buscar canais da conta ${account.email}:`, err);
          }
        }
        
        setChannels(channelsWithAccounts);
      } catch (err) {
        console.error('Erro ao buscar canais:', err);
        setError('Não foi possível carregar todos os canais. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    if (accounts.length > 0) {
      fetchChannels();
    } else {
      setLoading(false);
    }
  }, [accounts]);
  
  // Selecionar um canal para trabalho
  const handleChannelSelect = (channel: ChannelWithAccount) => {
    if (onChannelSelect) {
      onChannelSelect(channel, channel.accountId);
    }
  };
  
  // Componente para mostrar estado de carregamento
  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-10 h-10 border-4 border-gray-600 border-t-red-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400">Carregando canais...</p>
    </div>
  );
  
  // Componente para mostrar estado vazio
  const EmptyState = () => (
    <div className="card p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Nenhum canal encontrado</h3>
      <p className="text-gray-400 mb-6">
        Parece que não conseguimos encontrar canais do YouTube vinculados a estas contas.
      </p>
      <p className="text-sm text-gray-500">
        Certifique-se de que as contas adicionadas possuem um canal do YouTube associado.
      </p>
    </div>
  );
  
  // Componente para mostrar estado de erro
  const ErrorState = ({ message }: { message: string }) => (
    <div className="card p-6 border border-red-800 bg-red-900/20">
      <div className="flex items-center mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500 mr-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <h3 className="text-red-400 font-medium">Erro</h3>
      </div>
      <p className="text-gray-300">{message}</p>
    </div>
  );
  
  // Se estiver carregando, mostrar animação
  if (loading) {
    return <LoadingState />;
  }
  
  // Se houver erro, mostrar mensagem
  if (error) {
    return <ErrorState message={error} />;
  }
  
  // Se não houver canais, mostrar estado vazio
  if (channels.length === 0) {
    return <EmptyState />;
  }
  
  // Mostrar grid de canais
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((channel) => (
        <div 
          key={`${channel.id}-${channel.accountId}`}
          className="card overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer"
          onClick={() => handleChannelSelect(channel)}
        >
          <div className="flex items-center p-4">
            <img 
              src={channel.thumbnailUrl} 
              alt={channel.title} 
              className="w-14 h-14 rounded-full mr-4 border-2 border-gray-800"
            />
            <div className="overflow-hidden">
              <h3 className="text-lg font-medium text-white truncate">{channel.title}</h3>
              {channel.customUrl && (
                <a 
                  href={`https://youtube.com/${channel.customUrl}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{channel.customUrl}
                </a>
              )}
              <div className="mt-2 flex items-center">
                <img 
                  src={channel.accountId ? `https://www.google.com/s2/favicons?domain=google.com&sz=16` : ''}
                  alt="Google" 
                  className="w-4 h-4 mr-1" 
                />
                <span className="text-xs text-gray-500 truncate">{channel.accountEmail}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 px-4 py-2 text-right">
            <button className="text-xs text-blue-400 hover:text-blue-300">
              Selecionar Canal
            </button>
          </div>
        </div>
      ))}
      
      {/* Botão para gerar relatório consolidado se houver mais de um canal */}
      {channels.length > 1 && (
        <div className="card overflow-hidden hover:shadow-md transition-all duration-300 border border-dashed border-gray-700 flex flex-col items-center justify-center p-6 col-span-1 sm:col-span-2 lg:col-span-3 mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-500 mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-1">Relatório Consolidado</h3>
          <p className="text-sm text-gray-400 mb-4 text-center">
            Gere um relatório combinando dados de todos os seus canais
          </p>
          <Link 
            to="/consolidated-report" 
            className="text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 px-4 rounded transition-colors"
          >
            Gerar Relatório Consolidado
          </Link>
        </div>
      )}
    </div>
  );
};

export default MultiChannelGrid; 