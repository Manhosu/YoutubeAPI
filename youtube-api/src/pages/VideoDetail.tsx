import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { youtubeService, type YoutubeVideo } from '../services/youtubeService';
import { useAuth } from '../contexts/AuthContext';
import { useMultiAccount } from '../contexts/MultiAccountContext';
import { videoTrackingService } from '../services/videoTrackingService';
import { reportService } from '../services/reportService';

const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeAccount } = useMultiAccount();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<YoutubeVideo | null>(null);
  const [playlistsContainingVideo, setPlaylistsContainingVideo] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Get video details
        const videoData = await youtubeService.getVideoById(id, activeAccount?.id);
        
        if (!videoData) {
          setError('Vídeo não encontrado ou não disponível');
          setLoading(false);
          return;
        }

        setVideo(videoData);
        
        // Get snapshots for this video
        const videoSnapshots = await videoTrackingService.getVideoSnapshots(id);
        setSnapshots(videoSnapshots);

      } catch (err) {
        console.error('Error fetching video details:', err);
        setError('Ocorreu um erro ao carregar os detalhes do vídeo');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [id, activeAccount]);

  // Format numbers for display
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="page-transition">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Detalhes do Vídeo</h1>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Carregando detalhes do vídeo...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-white p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}
        
        {!loading && video && (
          <div className="card p-6 mb-8">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-64 h-40 rounded-lg overflow-hidden mr-6 mb-4 md:mb-0">
                <img 
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">{video.title}</h2>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-400 text-sm mb-4">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span>{video.channelTitle}</span>
                  </div>
                  
                  {video.publishedAt && (
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <span>Publicado em {formatDate(video.publishedAt)}</span>
                    </div>
                  )}
                  
                  {video.viewCount !== undefined && (
                    <div className="flex items-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">{formatNumber(video.viewCount)} visualizações</span>
                    </div>
                  )}
                  
                  {video.playlists && (
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-blue-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                      </svg>
                      <span>Presente em {video.playlists.length} playlists</span>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-300 mb-4">{video.description || 'Sem descrição'}</p>
                
                <a
                  href={`https://youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-400 transition-colors flex items-center w-fit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Assistir no YouTube
                </a>
              </div>
            </div>
          </div>
        )}
        
        {!loading && video && video.playlists && video.playlists.length > 0 && (
          <div className="card overflow-hidden mb-8">
            <div className="border-b border-gray-800 p-4">
              <h3 className="text-lg font-medium text-white">Playlists Contendo Este Vídeo</h3>
            </div>
            <div className="overflow-y-auto max-h-96">
              {video.playlists.map((playlist) => (
                <div key={playlist.id} className="border-b border-gray-800 hover:bg-[#1a1a1a] p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium mb-1">{playlist.title}</p>
                      <p className="text-sm text-gray-400">{playlist.itemCount} vídeos</p>
                    </div>
                    <a
                      href={`/playlist/${playlist.id}`}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      Ver playlist
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!loading && snapshots.length > 0 && (
          <div className="card overflow-hidden mb-8">
            <div className="border-b border-gray-800 p-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Histórico de Visualizações</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => reportService.exportSnapshotsToCSV(snapshots, `snapshots-${video?.title || id}.csv`)}
                  className="flex items-center gap-1 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  CSV
                </button>
                <button
                  onClick={() => reportService.exportSnapshotsToJSON(snapshots, `snapshots-${video?.title || id}.json`)}
                  className="flex items-center gap-1 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  JSON
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-4 text-left text-gray-400 font-medium">Data</th>
                    <th className="p-4 text-left text-gray-400 font-medium">Visualizações</th>
                    <th className="p-4 text-left text-gray-400 font-medium">Crescimento</th>
                    <th className="p-4 text-left text-gray-400 font-medium">Playlists Ativas</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot, index) => {
                    const prevSnapshot = index > 0 ? snapshots[index - 1] : null;
                    const growth = prevSnapshot ? snapshot.totalViews - prevSnapshot.totalViews : 0;
                    const growthPercentage = prevSnapshot && prevSnapshot.totalViews > 0 
                      ? (growth / prevSnapshot.totalViews) * 100 
                      : 0;
                    
                    return (
                      <tr key={index} className="border-b border-gray-800 hover:bg-[#1a1a1a]">
                        <td className="p-4">
                          <span className="text-white">{formatDate(snapshot.date)}</span>
                        </td>
                        <td className="p-4 text-white">{formatNumber(snapshot.totalViews)}</td>
                        <td className="p-4">
                          {index > 0 ? (
                            <div className="flex items-center">
                              <span className={`${growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {growth >= 0 ? '+' : ''}{formatNumber(growth)}
                              </span>
                              <span className={`ml-2 text-xs ${growthPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ({growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(2)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="p-4 text-white">
                          {snapshot.playlists ? snapshot.playlists.length : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {!loading && (!snapshots || snapshots.length === 0) && (
          <div className="card p-6">
            <p className="text-gray-400">Nenhum histórico de visualizações disponível para este vídeo.</p>
            <p className="text-sm text-gray-500 mt-2">Os snapshots são capturados diariamente para acompanhar o progresso das visualizações.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VideoDetail; 