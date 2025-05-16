import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { youtubeService, type YoutubeChannel, type YoutubePlaylist, type PlaylistVideoItem } from '../services/youtubeService';
import { useAuth } from '../contexts/AuthContext';
import { useMultiAccount } from '../contexts/MultiAccountContext';
import VideoPlaylistImpact from '../components/VideoPlaylistImpact';
import { videoTrackingService } from '../services/videoTrackingService';

// Interface para os resultados de pesquisa em todas as playlists
interface PlaylistWithFoundVideos {
  playlist: YoutubePlaylist;
  foundVideos: PlaylistVideoItem[];
}

// Tipo para os tipos de pesquisa
type SearchType = 'title' | 'id' | 'url';

const Dashboard = () => {
  const { user } = useAuth();
  const { activeAccount } = useMultiAccount();
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [playlists, setPlaylists] = useState<YoutubePlaylist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<YoutubePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'playlist' | 'video'>('playlist');
  const [searchType, setSearchType] = useState<SearchType>('title');
  const [videoSearchResults, setVideoSearchResults] = useState<PlaylistWithFoundVideos[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlistStats, setPlaylistStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotScheduled, setSnapshotScheduled] = useState(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Usar ID da conta ativa para buscar dados
        const accountId = activeAccount?.id;
        console.log('Buscando dados para conta:', accountId || 'padrão');
        
        // Buscar canais do usuário
        const channelsData = await youtubeService.getMyChannels(accountId);
        setChannels(channelsData);
        
        // Buscar playlists do usuário
        const playlistsData = await youtubeService.getMyPlaylists(undefined, accountId);
        
        // Certificar que cada playlist tem visualizações inicializadas
        const playlistsWithViews = playlistsData.playlists.map(playlist => ({
          ...playlist,
          totalViews: playlist.totalViews || 0
        }));
        
        setPlaylists(playlistsWithViews);
        setFilteredPlaylists(playlistsWithViews);
        setNextPageToken(playlistsData.nextPageToken);
        
        // Carregar estatísticas para as playlists carregadas
        await loadPlaylistStats(playlistsWithViews);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Ocorreu um erro ao carregar seus dados do YouTube. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, activeAccount]);

  // Filtrar playlists com base no termo de pesquisa
  useEffect(() => {
    if (searchMode === 'playlist') {
      if (searchTerm.trim() === '') {
        setFilteredPlaylists(playlists);
      } else {
        const term = searchTerm.toLowerCase();
        const filtered = playlists.filter(playlist => 
          playlist.title.toLowerCase().includes(term) || 
          (playlist.description && playlist.description.toLowerCase().includes(term))
        );
        setFilteredPlaylists(filtered);
      }
      // Limpar resultados de pesquisa de vídeos quando mudar para pesquisa de playlist
      setVideoSearchResults([]);
    }
  }, [searchTerm, playlists, searchMode]);

  const loadMorePlaylists = async () => {
    if (!nextPageToken) return;
    
    try {
      setLoading(true);
      const accountId = activeAccount?.id;
      const playlistsData = await youtubeService.getMyPlaylists(nextPageToken, accountId);
      
      // Certificar que cada nova playlist tem visualizações inicializadas
      const newPlaylistsWithViews = playlistsData.playlists.map(playlist => ({
        ...playlist,
        totalViews: playlist.totalViews || 0
      }));
      
      const updatedPlaylists = [...playlists, ...newPlaylistsWithViews];
      setPlaylists(updatedPlaylists);
      
      // Atualizar playlists filtradas também
      if (searchTerm.trim() === '' || searchMode === 'video') {
        setFilteredPlaylists(updatedPlaylists);
      } else {
        const term = searchTerm.toLowerCase();
        const filtered = updatedPlaylists.filter(playlist => 
          playlist.title.toLowerCase().includes(term) || 
          (playlist.description && playlist.description.toLowerCase().includes(term))
        );
        setFilteredPlaylists(filtered);
      }
      
      setNextPageToken(playlistsData.nextPageToken);
    } catch (err) {
      console.error('Erro ao carregar mais playlists:', err);
      setError('Ocorreu um erro ao carregar mais playlists.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    
    // Limpar resultados de pesquisa de vídeos quando o termo for vazio
    if (e.target.value.trim() === '') {
      setVideoSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setVideoSearchResults([]);
    setSearchMode('playlist');
  };

  const searchVideos = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    setError(null);
    
    try {
      const accountId = activeAccount?.id;
      let results: PlaylistWithFoundVideos[] = [];
      
      // Realizar a pesquisa com base no tipo selecionado
      if (searchType === 'title') {
        results = await youtubeService.searchVideoAcrossPlaylists(searchTerm, accountId);
      } else if (searchType === 'id') {
        // Buscar vídeo por ID
        const video = await youtubeService.getVideoById(searchTerm, accountId);
        if (video && video.playlists) {
          // Construir resultados no mesmo formato
          results = await Promise.all(video.playlists.map(async (playlist) => {
            const playlistItems = await youtubeService.getPlaylistItems(playlist.id, undefined, false, accountId);
            const foundVideo = playlistItems.find(item => item.videoId === searchTerm);
            return {
              playlist,
              foundVideos: foundVideo ? [foundVideo] : []
            };
          }));
          results = results.filter(result => result.foundVideos.length > 0);
        }
      } else if (searchType === 'url') {
        // Extrair ID do vídeo da URL e buscar
        const videoByUrl = await youtubeService.getVideoByUrl(searchTerm, accountId);
        if (videoByUrl && videoByUrl.playlists) {
          results = await Promise.all(videoByUrl.playlists.map(async (playlist) => {
            const playlistItems = await youtubeService.getPlaylistItems(playlist.id, undefined, false, accountId);
            const foundVideo = playlistItems.find(item => item.videoId === videoByUrl.id);
            return {
              playlist,
              foundVideos: foundVideo ? [foundVideo] : []
            };
          }));
          results = results.filter(result => result.foundVideos.length > 0);
        }
      }
      
      setVideoSearchResults(results);
      
      if (results.length === 0) {
        setError(`Nenhum vídeo encontrado com o termo "${searchTerm}" em suas playlists.`);
      }
    } catch (err) {
      console.error('Erro ao pesquisar vídeos:', err);
      setError('Ocorreu um erro ao pesquisar vídeos nas playlists.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchMode === 'video') {
      searchVideos();
    }
  };

  // Formatar número com separadores de milhar
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Função auxiliar para determinar a cor da barra de progresso com base no impacto
  const getImpactColor = (percentage: number): string => {
    if (percentage >= 75) return '#22c55e'; // Verde para alto impacto
    if (percentage >= 50) return '#3b82f6'; // Azul para impacto médio-alto
    if (percentage >= 25) return '#f59e0b'; // Amarelo para impacto médio
    return '#ef4444'; // Vermelho para baixo impacto
  };

  // Adicionar nova função para carregar estatísticas de visualização
  const loadPlaylistStats = async (playlistsToLoad: YoutubePlaylist[]) => {
    if (playlistsToLoad.length === 0) return;
    
    try {
      setLoadingStats(true);
      const accountId = activeAccount?.id;
      
      // Obter IDs de todas as playlists
      const playlistIds = playlistsToLoad.map(playlist => playlist.id);
      
      // Buscar estatísticas para todas as playlists de uma vez
      const stats = await youtubeService.getPlaylistViewStats(playlistIds, accountId);
      
      // Criar um objeto de mapeamento de ID para contagem de visualizações
      const statsMap: Record<string, number> = {};
      stats.forEach(stat => {
        statsMap[stat.playlistId] = stat.totalViews;
      });
      
      setPlaylistStats(statsMap);
    } catch (error) {
      console.error('Erro ao carregar estatísticas das playlists:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Função para agendar snapshot automático diário
  const scheduleAutomaticSnapshot = () => {
    if (snapshotScheduled) return;
    
    // Verificar se já existe um agendamento salvo
    const lastSchedule = localStorage.getItem('last_snapshot_schedule');
    const now = new Date();
    
    if (lastSchedule) {
      const lastDate = new Date(lastSchedule);
      // Se já foi agendado hoje, não faz nada
      if (
        lastDate.getDate() === now.getDate() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getFullYear() === now.getFullYear()
      ) {
        console.log('Snapshot já agendado para hoje');
        setSnapshotScheduled(true);
        return;
      }
    }
    
    // Agendar snapshot para o próximo dia às 3am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    
    const timeUntilNextSnapshot = tomorrow.getTime() - now.getTime();
    
    console.log(`Agendando snapshot para ${tomorrow.toLocaleString()}, em ${timeUntilNextSnapshot / 1000 / 60 / 60} horas`);
    
    // Agendar snapshot
    setTimeout(async () => {
      console.log('Executando snapshot automático');
      try {
        await videoTrackingService.takeSnapshotsForAllVideos(activeAccount?.id);
        localStorage.setItem('last_snapshot_schedule', new Date().toISOString());
        // Reagendar para o próximo dia
        scheduleAutomaticSnapshot();
      } catch (error) {
        console.error('Erro ao executar snapshot automático:', error);
      }
    }, timeUntilNextSnapshot);
    
    // Salvar data de agendamento
    localStorage.setItem('last_snapshot_schedule', now.toISOString());
    setSnapshotScheduled(true);
  };

  // Agendar snapshot automático quando o componente for montado
  useEffect(() => {
    scheduleAutomaticSnapshot();
  }, []);

  // Função para executar snapshot manual de todos os vídeos
  const takeSnapshotForAllVideos = async () => {
    if (snapshotsLoading) return;
    
    setSnapshotsLoading(true);
    try {
      await videoTrackingService.takeSnapshotsForAllAccounts();
      
      // Atualizar timestamp do último snapshot
      const now = new Date().toLocaleString();
      setLastSnapshotTime(now);
      
      // Salvar timestamp no localStorage
      localStorage.setItem('last_snapshot_time', now);
      
      // Mostrar notificação de sucesso
      alert('Snapshots capturados com sucesso para todos os canais!');
    } catch (error) {
      console.error('Erro ao executar snapshots:', error);
      setError('Ocorreu um erro ao capturar dados de snapshot.');
    } finally {
      setSnapshotsLoading(false);
    }
  };
  
  // Verificar se há snapshot agendado e último timestamp
  useEffect(() => {
    // Recuperar último timestamp do snapshot
    const storedTime = localStorage.getItem('last_snapshot_time');
    if (storedTime) {
      setLastSnapshotTime(storedTime);
    }
    
    // Verificar quando será o próximo snapshot
    const checkNextSnapshot = () => {
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(3, 0, 0, 0); // 3:00 AM
      
      if (now.getHours() >= 3) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      setSnapshotScheduled(true);
    };
    
    checkNextSnapshot();
  }, []);

  return (
    <Layout>
      <div className="page-transition">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Meu Dashboard</h1>
        
        {loading && playlists.length === 0 && channels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Carregando seus dados do YouTube...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-white p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}
        
        {!loading && channels.length === 0 && (
          <div className="card p-6 mb-8">
            <p className="text-gray-400">Nenhum canal encontrado. Verifique se você está logado corretamente na sua conta do YouTube.</p>
          </div>
        )}
        
        {/* Seção de Gerenciamento de Snapshots */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Snapshots para Análise de Impacto
          </h2>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <p className="text-gray-300">
                Os snapshots capturam diariamente o número de visualizações e as playlists de cada vídeo para análise de impacto.
              </p>
              
              {lastSnapshotTime && (
                <p className="text-sm text-gray-400 mt-1">
                  Último snapshot: {lastSnapshotTime}
                </p>
              )}
              
              {snapshotScheduled && (
                <p className="text-sm text-gray-400 mt-1">
                  Próximo snapshot automático: 3:00 AM
                </p>
              )}
            </div>
            
            <button
              onClick={takeSnapshotForAllVideos}
              disabled={snapshotsLoading}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {snapshotsLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  Snapshot Agora (Todos os Canais)
                </>
              )}
            </button>
          </div>
          
          <div className="bg-gray-700/50 p-3 rounded text-sm text-gray-300">
            <p className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              Os snapshots são capturados automaticamente às 3:00 da manhã para todos os canais e vídeos.
            </p>
          </div>
        </div>
        
        {/* Seção de Canais */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Seus Canais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(channel => (
              <div key={channel.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                {channel.thumbnailUrl && (
                  <img 
                    src={channel.thumbnailUrl} 
                    alt={channel.title} 
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h3 className="text-white font-medium">{channel.title}</h3>
                  <p className="text-gray-400 text-sm">
                    {channel.subscriberCount ? `${channel.subscriberCount} inscritos` : 'Inscritos ocultos'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Seção de Pesquisa */}
        <section className="mb-8">
          <div className="card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h2 className="text-2xl font-semibold subtle-gradient-text mb-4 md:mb-0">Busca Avançada</h2>
              
              <div className="flex items-center gap-2">
                <button
                  className={`mr-4 px-3 py-1 rounded-md text-sm transition-colors ${searchMode === 'playlist' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}
                  onClick={() => setSearchMode('playlist')}
                >
                  Playlists
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${searchMode === 'video' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}
                  onClick={() => setSearchMode('video')}
                >
                  Vídeos
                </button>
                
                {searchMode === 'video' && (
                  <button
                    onClick={takeSnapshotForAllVideos}
                    disabled={snapshotsLoading}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {snapshotsLoading ? 'Processando...' : 'Snapshot Geral'}
                  </button>
                )}
              </div>
            </div>
            
            {searchMode === 'video' && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-3 mb-3">
                  <label className={`px-4 py-2 rounded-md cursor-pointer transition-colors ${searchType === 'title' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                    <input
                      type="radio"
                      value="title"
                      checked={searchType === 'title'}
                      onChange={() => setSearchType('title')}
                      className="sr-only"
                    />
                    Título do vídeo
                  </label>
                  
                  <label className={`px-4 py-2 rounded-md cursor-pointer transition-colors ${searchType === 'id' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                    <input
                      type="radio"
                      value="id"
                      checked={searchType === 'id'}
                      onChange={() => setSearchType('id')}
                      className="sr-only"
                    />
                    ID do vídeo
                  </label>
                  
                  <label className={`px-4 py-2 rounded-md cursor-pointer transition-colors ${searchType === 'url' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                    <input
                      type="radio"
                      value="url"
                      checked={searchType === 'url'}
                      onChange={() => setSearchType('url')}
                      className="sr-only"
                    />
                    URL do vídeo
                  </label>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder={
                    searchMode === 'playlist' 
                      ? "Pesquisar playlists..." 
                      : searchType === 'title'
                        ? "Pesquisar vídeos por título..."
                        : searchType === 'id'
                          ? "Digite o ID do vídeo (ex: dQw4w9WgXcQ)"
                          : "Digite a URL do vídeo (ex: https://youtu.be/dQw4w9WgXcQ)"
                  }
                  className="w-full bg-[#1f1f1f] text-white px-4 py-3 rounded-md pr-24 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-gray-400 hover:text-white px-2 py-1 mr-1"
                    >
                      Limpar
                    </button>
                  )}
                  
                  {searchMode === 'video' && (
                    <button 
                      type="submit" 
                      className="bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                      disabled={searching || !searchTerm.trim()}
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </section>
        
        {/* Resultados de pesquisa de vídeos */}
        {searchMode === 'video' && videoSearchResults.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 subtle-gradient-text">Resultados da Pesquisa</h2>
            
            <div className="space-y-6">
              {/* Condensed video info at the top - shows once */}
              {videoSearchResults[0]?.foundVideos[0] && (
                <div className="card p-6 mb-6">
                  <div className="flex items-start">
                    <div className="w-32 h-24 overflow-hidden rounded-md flex-shrink-0 mr-4">
                      <img 
                        src={videoSearchResults[0].foundVideos[0].thumbnailUrl || '/placeholder-video.jpg'}
                        alt={videoSearchResults[0].foundVideos[0].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-medium text-white mb-2">{videoSearchResults[0].foundVideos[0].title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-400 text-sm mb-4">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span>ID: {videoSearchResults[0].foundVideos[0].videoId}</span>
                        </div>
                        
                        {videoSearchResults[0].foundVideos[0].viewCount !== undefined && (
                          <div className="flex items-center text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-red-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">{formatNumber(videoSearchResults[0].foundVideos[0].viewCount)} visualizações totais</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-blue-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                          </svg>
                          <span>Presente em {videoSearchResults.length} playlists</span>
                        </div>
                      </div>
                      
                      <a
                        href={`https://youtube.com/watch?v=${videoSearchResults[0].foundVideos[0].videoId}`}
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
                  
                  {/* Adicionar componente de impacto de playlists */}
                  <div className="mt-6">
                    <VideoPlaylistImpact
                      videoId={videoSearchResults[0].foundVideos[0].videoId}
                    />
                  </div>
                </div>
              )}
              
              {/* IMPACTO POR PLAYLIST - Versão atualizada */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">Impacto por Playlist</h3>
                </div>
                
                <div>
                  {videoSearchResults.map(result => {
                    const video = result.foundVideos[0]; // Get the first video from each playlist's results
                    
                    // Usar estatísticas carregadas ou valor padrão
                    const playlistId = result.playlist.id;
                    const playlistViews = playlistStats[playlistId] || 0;
                    
                    return (
                      <div key={result.playlist.id} className="border-b border-gray-800 hover:bg-[#1a1a1a]">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <div className="w-14 h-14 overflow-hidden rounded-md flex-shrink-0 mr-3">
                              <img 
                                src={result.playlist.thumbnailUrl || '/placeholder-playlist.jpg'}
                                alt={result.playlist.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <h4 className="font-medium text-white mr-3 truncate">{result.playlist.title}</h4>
                              </div>
                            </div>
                            
                            {/* Show view count prominently */}
                            <div className="flex items-center ml-3">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1.5 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {loadingStats ? (
                                <div className="w-8 h-5 bg-gray-700 animate-pulse rounded"></div>
                              ) : (
                                <span className="text-xl font-medium text-white">{formatNumber(playlistViews)}</span>
                              )}
                            </div>
                          </div>
                          
                          <Link
                            to={`/playlist/${result.playlist.id}`}
                            className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors flex items-center ml-6"
                          >
                            <span>Ver playlist</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Seção de Playlists */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-2xl font-semibold subtle-gradient-text mb-4 md:mb-0">Minhas Playlists</h2>
          </div>
          
          {!loading && filteredPlaylists.length === 0 && searchMode === 'playlist' && (
            <div className="card p-6">
              {searchTerm ? (
                <p className="text-gray-400">Nenhuma playlist encontrada para "{searchTerm}".</p>
              ) : (
                <p className="text-gray-400">Nenhuma playlist encontrada.</p>
              )}
            </div>
          )}
          
          {searchMode === 'playlist' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredPlaylists.map(playlist => (
                <div key={playlist.id} className="card overflow-hidden group">
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={playlist.thumbnailUrl || '/placeholder-playlist.jpg'} 
                      alt={playlist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-xs text-gray-400">{playlist.itemCount} vídeos</p>
                      <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{playlist.description || 'Sem descrição'}</p>
                    <Link
                      to={`/playlist/${playlist.id}`}
                      className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors flex items-center"
                    >
                      <span>Ver detalhes</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {nextPageToken && searchTerm.trim() === '' && searchMode === 'playlist' && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMorePlaylists}
                disabled={loading}
                className="btn-secondary flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Carregando...
                  </>
                ) : (
                  <>
                    Carregar mais playlists
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard; 