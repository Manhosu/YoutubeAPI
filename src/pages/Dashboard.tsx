import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlaylistImpact from '../components/PlaylistImpact';
import { youtubeService } from '../services/youtubeService';

interface Playlist {
  id: string;
  title: string;
  totalViews?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentAccount, setCurrentAccount] = useState<{id: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [playlistStats, setPlaylistStats] = useState<Record<string, number>>({});

  useEffect(() => {
    // Buscar playlists e conta atual
    const fetchData = async () => {
      try {
        setLoading(true);
        // Em um ambiente real, buscar dados de APIs
        const demoPlaylists = [
          { id: "teste2", title: 'Teste 2' },
          { id: "testeprojeto", title: 'Teste para projeto' },
        ];
        
        setPlaylists(demoPlaylists);
        setCurrentAccount({ id: 'demo' });
        
        // Buscar estatísticas de visualização
        const playlistIds = demoPlaylists.map(p => p.id);
        const stats = await youtubeService.getPlaylistViewStats(playlistIds);
        
        // Criar mapa de IDs para visualizações
        const statsMap: Record<string, number> = {};
        stats.forEach(stat => {
          statsMap[stat.playlistId] = stat.totalViews;
        });
        
        setPlaylistStats(statsMap);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="p-8">
      {/* Impacto por Playlist */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 text-gray-200">Impacto por Playlist</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-gray-400">Carregando...</div>
          ) : (
            playlists.map(playlist => (
              <div key={playlist.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-white">{playlist.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-white font-medium">
                        {playlistStats[playlist.id]?.toLocaleString() || "0"}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => navigate(`/playlist/${playlist.id}`)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                    >
                      Ver playlist →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 