import React, { useState, useEffect } from 'react';
import { videoTrackingService } from '../services/videoTrackingService';
import { useMultiAccount } from '../contexts/MultiAccountContext';

interface PlaylistViewsBreakdownProps {
  videoId: string;
}

const PlaylistViewsBreakdown: React.FC<PlaylistViewsBreakdownProps> = ({ videoId }) => {
  const { activeAccount } = useMultiAccount();
  const [playlistViews, setPlaylistViews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Formatar número com separadores de milhar
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  useEffect(() => {
    const loadPlaylistViews = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await videoTrackingService.estimatePlaylistViews(videoId, activeAccount?.id);
        setPlaylistViews(data || []);
      } catch (err) {
        console.error('Erro ao carregar dados de visualizações por playlist:', err);
        setError('Falha ao carregar dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    if (videoId) {
      loadPlaylistViews();
    }
  }, [videoId, activeAccount, refreshKey]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExportLoading(true);
    try {
      await videoTrackingService.exportImpactData(videoId, format);
    } catch (err: any) {
      setError(err?.message || 'Erro ao exportar dados');
    } finally {
      setExportLoading(false);
    }
  };

  // Função para registrar uma visualização de playlist
  const registerPlaylistView = (playlistId: string) => {
    videoTrackingService.registerPlaylistView(videoId, playlistId);
    // Força a atualização dos dados armazenados
    videoTrackingService.forceUpdateData(videoId);
    // Atualizar os dados após registrar a visualização
    setRefreshKey(prev => prev + 1); // Força a atualização via useEffect
  };
  
  // Função para limpar dados armazenados e reiniciar contadores
  const clearStoredData = () => {
    try {
      // Limpar dados específicos do vídeo
      localStorage.removeItem(`youtube_analytics_data_${videoId}`);
      // Forçar atualização
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      console.error('Erro ao limpar dados:', e);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Visualizações por Playlist</h2>
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Carregando visualizações da playlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Visualizações por Playlist</h2>
        <div className="p-4 text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (playlistViews.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Visualizações por Playlist</h2>
        <div className="p-4 text-center">
          <p className="text-gray-400">Este vídeo não aparece em nenhuma playlist.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-white text-center mb-6">Visualizações por Playlist</h2>
      
      <hr className="border-gray-700 mb-6" />

      <div>
        {playlistViews.map((playlist) => (
          <div 
            key={playlist.playlistId} 
            className="mb-6 cursor-pointer"
            onClick={() => registerPlaylistView(playlist.playlistId)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <span className="text-white text-lg">{playlist.playlistTitle}</span>
              </div>
              <div className="text-white text-2xl font-semibold">
                {formatNumber(playlist.estimatedViews)}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400">Contribuição estimada:</span>
              <span className="bg-red-600 text-white text-sm px-2 py-0.5 rounded">
                {playlist.percentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${Math.max(0.5, playlist.percentage)}%` }}
              />
            </div>
            
            <div className="text-sm text-gray-500">
              visualizações
            </div>
            
            <hr className="border-gray-700 mt-6" />
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-between">
        <button
          onClick={clearStoredData}
          className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Limpar Dados
        </button>
        
        <button
          onClick={() => handleExport('csv')}
          disabled={exportLoading}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded flex items-center disabled:opacity-50"
        >
          {exportLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
          ) : (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          Exportar dados
        </button>
      </div>
    </div>
  );
};

export default PlaylistViewsBreakdown; 