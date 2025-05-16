import React from 'react';

interface PlaylistImpactPreviewProps {
  videoId?: string;
}

export const VideoPlaylistImpactPreview: React.FC<PlaylistImpactPreviewProps> = ({ videoId = "dQw4w9WgXcQ" }) => {
  // Dados simulados para demonstração
  const mockImpactData = [
    {
      playlistId: "PL1234567890",
      playlistTitle: "Melhores Vídeos 2023",
      viewsContribution: 12450,
      contributionPercentage: 45.2,
      daysInPlaylist: 42
    },
    {
      playlistId: "PL9876543210",
      playlistTitle: "Conteúdo Recomendado",
      viewsContribution: 8236,
      contributionPercentage: 29.8,
      daysInPlaylist: 38
    },
    {
      playlistId: "PL5432167890",
      playlistTitle: "Tutoriais Avançados",
      viewsContribution: 4125,
      contributionPercentage: 14.5,
      daysInPlaylist: 26
    },
    {
      playlistId: "PL1357924680",
      playlistTitle: "Outros Vídeos",
      viewsContribution: 2890,
      contributionPercentage: 10.5,
      daysInPlaylist: 22
    }
  ];

  const getImpactColor = (percentage: number): string => {
    if (percentage >= 50) return '#22c55e'; // Verde para alto impacto
    if (percentage >= 25) return '#3b82f6'; // Azul para impacto médio-alto
    if (percentage >= 10) return '#f59e0b'; // Amarelo para impacto médio
    return '#ef4444'; // Vermelho para baixo impacto
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">
          Prévia: Impacto de Playlists
          <span className="text-sm text-gray-400 ml-2">(simulação com dados fictícios)</span>
        </h3>
        
        <div className="flex gap-2">
          <button
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            CSV
          </button>
          <button
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            JSON
          </button>
          
          <button
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Snapshot Agora
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {mockImpactData.map(impact => (
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

      {/* Exemplo de exportação JSON */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-white mb-2">Exemplo de Exportação JSON:</h4>
        <div className="bg-gray-900 p-3 rounded text-xs font-mono text-gray-300 overflow-auto max-h-48">
          {`{
  "videoId": "${videoId}",
  "title": "Vídeo de Exemplo",
  "totalViews": 27701,
  "snapshotPeriod": {
    "startDate": "2023-08-15",
    "endDate": "2023-09-26",
    "totalDays": 42
  },
  "impactData": ${JSON.stringify(mockImpactData, null, 2)}
}`}
        </div>
      </div>

      {/* Exemplo de exportação CSV */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-white mb-2">Exemplo de Exportação CSV:</h4>
        <div className="bg-gray-900 p-3 rounded text-xs font-mono text-gray-300 overflow-auto max-h-48">
          {`Dados de Impacto de Playlists
ID do Vídeo,${videoId}
Título do Vídeo,Vídeo de Exemplo
Total de Visualizações,27701
Período de Análise,2023-08-15 a 2023-09-26
Total de Snapshots,42

Playlist,Visualizações Contribuídas,Percentual de Contribuição,Dias na Playlist
Melhores Vídeos 2023,12450,45.20%,42
Conteúdo Recomendado,8236,29.80%,38
Tutoriais Avançados,4125,14.50%,26
Outros Vídeos,2890,10.50%,22

Histórico de Snapshots
Data,Total de Visualizações,Playlists
2023-08-15,12597,Melhores Vídeos 2023; Conteúdo Recomendado
2023-08-16,12802,Melhores Vídeos 2023; Conteúdo Recomendado
...
2023-09-25,27425,Melhores Vídeos 2023; Conteúdo Recomendado; Tutoriais Avançados; Outros Vídeos
2023-09-26,27701,Melhores Vídeos 2023; Conteúdo Recomendado; Tutoriais Avançados; Outros Vídeos`}
        </div>
      </div>
    </div>
  );
};

export default VideoPlaylistImpactPreview; 