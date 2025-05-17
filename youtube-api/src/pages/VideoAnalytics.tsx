import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { youtubeService, type YoutubeVideo, type PlaylistVideoItem } from '../services/youtubeService';
import { useAuth } from '../contexts/AuthContext';
import { useMultiAccount } from '../contexts/MultiAccountContext';
import { videoTrackingService } from '../services/videoTrackingService';
import { reportService } from '../services/reportService';

const VideoAnalytics: React.FC = () => {
  const { activeAccount } = useMultiAccount();
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<YoutubeVideo | null>(null);
  const [playlistViewsData, setPlaylistViewsData] = useState<{playlistId: string, playlistTitle: string, views: number}[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [totalViews, setTotalViews] = useState<number>(0);

  // Inicializar as datas para últimos 30 dias
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) {
      setError('Por favor, insira um link de vídeo válido.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Extrair o ID do vídeo da URL
      const videoId = extractVideoId(videoUrl);
      
      if (!videoId) {
        setError('URL de vídeo inválida. Por favor, verifique o link e tente novamente.');
        setLoading(false);
        return;
      }

      // Buscar dados do vídeo
      const video = await youtubeService.getVideoById(videoId, activeAccount?.id);
      
      if (!video) {
        setError('Vídeo não encontrado ou não disponível na sua conta.');
        setLoading(false);
        return;
      }
      
      setVideoData(video);
      setTotalViews(video.viewCount || 0);

      // Buscar snapshots para o período selecionado
      const videoSnapshots = await videoTrackingService.getVideoSnapshotsInPeriod(
        videoId,
        new Date(startDate),
        new Date(endDate)
      );
      
      setSnapshots(videoSnapshots);

      // Compilar dados de visualizações por playlist
      if (video.playlists && video.playlists.length > 0) {
        // Preparar dados de visualizações por playlist
        const playlistData = await Promise.all(
          video.playlists.map(async (playlist) => {
            // Obter todos os vídeos da playlist para contexto
            const playlistItems = await youtubeService.getPlaylistItems(
              playlist.id, 
              undefined, 
              true, 
              activeAccount?.id
            );
            
            // Encontrar este vídeo na playlist
            const videoInPlaylist = playlistItems.find(item => item.videoId === videoId);
            
            // Calcular impacto da playlist neste vídeo
            const playlistImpact = await videoTrackingService.calculatePlaylistImpact(videoId, playlist.id);
            
            return {
              playlistId: playlist.id,
              playlistTitle: playlist.title,
              views: videoInPlaylist?.viewCount || 0,
              impactPercentage: playlistImpact?.contributionPercentage || 0
            };
          })
        );
        
        // Ordenar por número de visualizações (maior para menor)
        const sortedData = playlistData.sort((a, b) => b.views - a.views);
        setPlaylistViewsData(sortedData);
      }
    } catch (err) {
      console.error('Erro ao analisar vídeo:', err);
      setError('Ocorreu um erro ao analisar o vídeo. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Função para extrair ID do vídeo de uma URL do YouTube
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Formatar números para exibição
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Formatar data para exibição 
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para calcular o crescimento de visualizações entre dois snapshots
  const calculateGrowth = (snapshots: any[]): { viewsGrowth: number, percentageGrowth: number } => {
    if (snapshots.length < 2) {
      return { viewsGrowth: 0, percentageGrowth: 0 };
    }
    
    // Pegar o primeiro e o último snapshot do período
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    const viewsGrowth = lastSnapshot.totalViews - firstSnapshot.totalViews;
    const percentageGrowth = firstSnapshot.totalViews === 0 
      ? 0 
      : (viewsGrowth / firstSnapshot.totalViews) * 100;
    
    return { viewsGrowth, percentageGrowth };
  };

  // Gerar dados de crescimento para o gráfico
  const getChartData = () => {
    if (snapshots.length < 2) return [];
    
    return snapshots.map(snapshot => ({
      date: formatDate(snapshot.date),
      views: snapshot.totalViews
    }));
  };

  const { viewsGrowth, percentageGrowth } = calculateGrowth(snapshots);
  const chartData = getChartData();

  return (
    <Layout>
      <div className="page-transition">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Análise de Visualizações por Vídeo</h1>
        
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Consulta de Visualizações</h2>
          
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">URL do Vídeo (YouTube)</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Cole a URL do vídeo (ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
              className="w-full bg-[#1f1f1f] text-white px-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-300 mb-2">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#1f1f1f] text-white px-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#1f1f1f] text-white px-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 transition-colors flex items-center justify-center w-full md:w-auto"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Analisar Visualizações</span>
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-white p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}
        
        {videoData && (
          <>
            <div className="card p-6 mb-8">
              <div className="flex flex-col md:flex-row mb-6">
                <div className="w-full md:w-64 h-40 rounded-lg overflow-hidden mb-4 md:mb-0 md:mr-6">
                  <img 
                    src={videoData.thumbnailUrl}
                    alt={videoData.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold text-white mb-2">{videoData.title}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => reportService.exportSnapshotsToCSV(snapshots, `analise-visualizacoes-${videoData.title}.csv`)}
                        className="flex items-center gap-1 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                        disabled={snapshots.length === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        CSV
                      </button>
                      <button
                        onClick={() => reportService.exportSnapshotsToJSON(snapshots, `analise-visualizacoes-${videoData.title}.json`)}
                        className="flex items-center gap-1 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                        disabled={snapshots.length === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        JSON
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-400 text-sm mb-4">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span>{videoData.channelTitle}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <span>Publicado em {new Date(videoData.publishedAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    <div className="flex items-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">{formatNumber(totalViews)} visualizações totais</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Visualizações no período</p>
                      <div className="flex items-baseline mt-1">
                        <p className="text-2xl font-bold text-white">{formatNumber(viewsGrowth)}</p>
                        {percentageGrowth !== 0 && (
                          <span className={`ml-2 text-sm ${percentageGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {percentageGrowth >= 0 ? '+' : ''}{percentageGrowth.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Período analisado</p>
                      <div className="mt-1">
                        <p className="text-white">
                          {formatDate(startDate)} - {formatDate(endDate)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Presente em</p>
                      <div className="mt-1">
                        <p className="text-2xl font-bold text-white">
                          {playlistViewsData.length} playlists
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="card overflow-hidden">
                <div className="border-b border-gray-800 p-4">
                  <h3 className="text-lg font-medium text-white">Visualizações por Playlist</h3>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {playlistViewsData.length > 0 ? (
                    <div>
                      {playlistViewsData.map((playlist, index) => (
                        <div key={playlist.playlistId} className="border-b border-gray-800 hover:bg-[#1a1a1a] p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium mb-1">{playlist.playlistTitle}</p>
                              <div className="flex items-center text-sm">
                                <span className="text-gray-400">Contribuição estimada:</span>
                                <span className="ml-2 px-2 py-0.5 rounded bg-opacity-30 text-white" 
                                  style={{ 
                                    backgroundColor: `rgba(${
                                      playlist.impactPercentage > 50 ? '34, 197, 94' : 
                                      playlist.impactPercentage > 25 ? '59, 130, 246' : 
                                      playlist.impactPercentage > 10 ? '234, 179, 8' : 
                                      '239, 68, 68'
                                    }, 0.5)` 
                                  }}
                                >
                                  {playlist.impactPercentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-white">{formatNumber(playlist.views)}</p>
                              <p className="text-xs text-gray-400">visualizações</p>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                              <div 
                                className="h-full rounded"
                                style={{ 
                                  width: `${(playlist.views / totalViews) * 100}%`,
                                  backgroundColor: playlist.impactPercentage > 50 ? '#22c55e' : 
                                    playlist.impactPercentage > 25 ? '#3b82f6' : 
                                    playlist.impactPercentage > 10 ? '#f59e0b' : 
                                    '#ef4444'
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      <p>Nenhuma playlist encontrada para este vídeo.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card overflow-hidden">
                <div className="border-b border-gray-800 p-4">
                  <h3 className="text-lg font-medium text-white">Evolução de Visualizações no Período</h3>
                </div>
                <div className="p-4">
                  {snapshots.length >= 2 ? (
                    <div className="h-[300px] relative">
                      {/* Aqui você pode integrar uma biblioteca de gráficos como Chart.js ou Recharts */}
                      <div className="grid grid-cols-1 gap-4">
                        {snapshots.map((snapshot, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="text-sm text-gray-400">{formatDate(snapshot.date)}</div>
                            <div className="flex-1 mx-6">
                              <div className="w-full h-8 relative">
                                <div 
                                  className="absolute h-8 bg-red-600/30 rounded-sm" 
                                  style={{ 
                                    width: `${(snapshot.totalViews / Math.max(...snapshots.map(s => s.totalViews))) * 100}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-white font-medium">{formatNumber(snapshot.totalViews)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      <p>Dados insuficientes para mostrar a evolução.</p>
                      <p className="mt-2 text-sm">É necessário ter pelo menos dois snapshots no período selecionado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="card overflow-hidden mb-8">
              <div className="border-b border-gray-800 p-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Dados Detalhados de Snapshots</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => reportService.exportSnapshotsToCSV(snapshots, `snapshots-detalhados-${videoData?.title || 'video'}.csv`)}
                    className="flex items-center gap-1 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                    disabled={snapshots.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => reportService.exportSnapshotsToJSON(snapshots, `snapshots-detalhados-${videoData?.title || 'video'}.json`)}
                    className="flex items-center gap-1 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                    disabled={snapshots.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Exportar JSON
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
                    {snapshots.length > 0 ? (
                      snapshots.map((snapshot, index) => {
                        const prevSnapshot = index > 0 ? snapshots[index - 1] : null;
                        const growth = prevSnapshot ? snapshot.totalViews - prevSnapshot.totalViews : 0;
                        const growthPercentage = prevSnapshot && prevSnapshot.totalViews > 0 
                          ? (growth / prevSnapshot.totalViews) * 100 
                          : 0;
                        
                        return (
                          <tr key={index} className="border-b border-gray-800 hover:bg-[#1a1a1a]">
                            <td className="p-4">
                              <span className="text-white">{formatDate(snapshot.date)}</span>
                              <span className="block text-xs text-gray-500">{new Date(snapshot.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-400">
                          Nenhum snapshot encontrado no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {videoData && !loading && (
              <div className="card p-6 mb-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <h3 className="text-lg font-semibold text-white mb-4">Exportar Análise Completa</h3>
                  <p className="text-gray-400 mb-6">Exporte todos os dados e snapshots analisados para uso em outras ferramentas</p>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => reportService.exportSnapshotsToCSV(snapshots, `analise-completa-${videoData.title}.csv`)}
                      className="flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-white px-6 py-3 rounded-md transition-colors"
                      disabled={snapshots.length === 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Exportar para CSV
                    </button>
                    <button
                      onClick={() => reportService.exportSnapshotsToJSON(snapshots, `analise-completa-${videoData.title}.json`)}
                      className="flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-white px-6 py-3 rounded-md transition-colors"
                      disabled={snapshots.length === 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Exportar para JSON
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default VideoAnalytics; 