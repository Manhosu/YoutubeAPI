import React, { useState } from 'react';
import useVideoTracking from '../hooks/useVideoTracking';
import { videoTrackingService } from '../services/videoTrackingService';

interface VideoPlaylistImpactProps {
  videoId: string;
  onTakeSnapshot?: () => void;
}

export const VideoPlaylistImpact: React.FC<VideoPlaylistImpactProps> = ({ videoId, onTakeSnapshot }) => {
  const { 
    impactData, 
    snapshotCount, 
    isLoading, 
    takeSnapshot, 
    hasEnoughSnapshots 
  } = useVideoTracking(videoId);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [showDemo, setShowDemo] = useState<boolean>(false);

  // Dados simulados para demonstração baseados no snapshot existente
  const getDemoImpactData = () => {
    // Tentar obter dados do único snapshot existente
    const snapshots = videoTrackingService.getVideoSnapshots(videoId);
    if (snapshots.length === 0) return [];

    // Usar o snapshot existente para criar dados simulados
    const snapshot = snapshots[0];
    const totalViews = snapshot.totalViews;
    
    // Criar dados de impacto simulados para as playlists existentes
    return snapshot.playlists.map((playlist, index) => {
      // Calcular a contribuição simulada baseada na posição da playlist
      // As primeiras playlists terão maior contribuição
      const factor = snapshot.playlists.length - index;
      const totalFactors = snapshot.playlists.reduce((sum, _, i) => sum + (snapshot.playlists.length - i), 0);
      const contribution = factor / totalFactors;
      
      return {
        playlistId: playlist.playlistId,
        playlistTitle: playlist.playlistTitle,
        viewsContribution: Math.round(totalViews * contribution),
        contributionPercentage: Math.round(contribution * 100),
        daysInPlaylist: Math.floor(Math.random() * 10) + 20 // 20-30 dias aleatórios
      };
    }).sort((a, b) => b.viewsContribution - a.viewsContribution);
  };

  const handleTakeSnapshot = async () => {
    await takeSnapshot();
    if (onTakeSnapshot) {
      onTakeSnapshot();
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!hasEnoughSnapshots && !showDemo) return;
    
    setExportLoading(true);
    try {
      videoTrackingService.exportImpactData(videoId, format);
    } catch (error) {
      console.error(`Erro ao exportar dados como ${format}:`, error);
    } finally {
      setExportLoading(false);
    }
  };

  const getImpactColor = (percentage: number): string => {
    if (percentage >= 50) return '#22c55e'; // Verde para alto impacto
    if (percentage >= 25) return '#3b82f6'; // Azul para impacto médio-alto
    if (percentage >= 10) return '#f59e0b'; // Amarelo para impacto médio
    return '#ef4444'; // Vermelho para baixo impacto
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num));
  };

  // Obter dados de impacto - reais ou simulados
  const displayData = hasEnoughSnapshots ? impactData : (showDemo ? getDemoImpactData() : []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">
          Impacto de Playlists
          {snapshotCount > 0 && <span className="text-sm text-gray-400 ml-2">({snapshotCount} snapshots)</span>}
          {showDemo && !hasEnoughSnapshots && <span className="text-sm text-yellow-400 ml-2">(dados simulados)</span>}
        </h3>
        
        <div className="flex gap-2">
          {(hasEnoughSnapshots || showDemo) && (
            <>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exportLoading}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              >
                JSON
              </button>
            </>
          )}
          
          <button
            onClick={handleTakeSnapshot}
            disabled={isLoading}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Processando...' : 'Snapshot Agora'}
          </button>
        </div>
      </div>

      {!hasEnoughSnapshots && !showDemo ? (
        <div className="text-center py-4 text-gray-400">
          <p>São necessários pelo menos 2 snapshots para calcular o impacto.</p>
          <p className="text-sm mt-2">
            Snapshots atuais: {snapshotCount}. 
            Capture snapshots diários para analisar o impacto das playlists no desempenho deste vídeo.
          </p>
          {snapshotCount === 1 && (
            <button 
              onClick={() => setShowDemo(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Mostrar Visualização Demo
            </button>
          )}
        </div>
      ) : displayData.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          Nenhuma playlist está contribuindo para as visualizações deste vídeo.
        </div>
      ) : (
        <div className="space-y-4">
          {displayData.map(impact => (
            <div key={impact.playlistId} className="bg-gray-700 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">{impact.playlistTitle}</span>
                <span className="text-white">
                  {formatNumber(impact.viewsContribution)} views
                </span>
              </div>
              
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                  style={{ 
                    width: `${Math.min(100, impact.contributionPercentage)}%`,
                    backgroundColor: getImpactColor(impact.contributionPercentage)
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                <span>Impacto: {impact.contributionPercentage.toFixed(1)}%</span>
                <span>Dias na playlist: {impact.daysInPlaylist}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPlaylistImpact; 