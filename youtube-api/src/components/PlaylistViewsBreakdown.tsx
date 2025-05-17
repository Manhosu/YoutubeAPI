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
  const [totalViews, setTotalViews] = useState<number>(0);

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
        // Calcular total de visualizações
        const total = data.reduce((acc: number, curr: any) => acc + curr.estimatedViews, 0);
        setTotalViews(total);
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

  const registerPlaylistView = (playlistId: string) => {
    videoTrackingService.registerPlaylistView(videoId, playlistId);
    videoTrackingService.forceUpdateData(videoId);
    setRefreshKey(prev => prev + 1);
  };
  
  const clearStoredData = () => {
    try {
      localStorage.removeItem(`youtube_analytics_data_${videoId}`);
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      console.error('Erro ao limpar dados:', e);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Visualizações por Playlist</h2>
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Carregando visualizações da playlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Visualizações por Playlist</h2>
        <div className="p-4 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (playlistViews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Visualizações por Playlist</h2>
        <div className="p-4 text-center">
          <p className="text-gray-600">Este vídeo não aparece em nenhuma playlist.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Visualizações por Playlist</h2>
        
        <div className="space-y-6">
          {playlistViews.map((playlist) => (
            <div 
              key={playlist.playlistId} 
              className="group cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors duration-200"
              onClick={() => registerPlaylistView(playlist.playlistId)}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-red-600">
                    {playlist.playlistTitle}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-600">Contribuição estimada:</span>
                    <span className="bg-red-50 text-red-600 text-sm px-2 py-0.5 rounded">
                      {playlist.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(playlist.estimatedViews)}
                </div>
              </div>
              
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-red-600"
                  style={{ width: `${Math.max(0.5, playlist.percentage)}%` }}
                />
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                visualizações
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t border-gray-200 p-4 flex justify-between items-center bg-gray-50 rounded-b-lg">
        <button
          onClick={clearStoredData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Limpar Dados
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center transition-colors duration-200"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center transition-colors duration-200"
          >
            JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistViewsBreakdown; 