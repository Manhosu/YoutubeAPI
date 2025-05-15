import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { youtubeService, type YoutubeChannel, type YoutubePlaylist, type PlaylistVideoItem } from '../services/youtubeService';
import { useAuth } from '../contexts/AuthContext';

// Interface para os resultados de pesquisa em todas as playlists
interface PlaylistWithFoundVideos {
  playlist: YoutubePlaylist;
  foundVideos: PlaylistVideoItem[];
}

// Tipo para os tipos de pesquisa
type SearchType = 'title' | 'id' | 'url';

const Dashboard = () => {
  const { user } = useAuth();
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
  const [searchProgress, setSearchProgress] = useState(0);
  const [totalPlaylistsToSearch, setTotalPlaylistsToSearch] = useState(0);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Buscar canais do usuário
        const channelsData = await youtubeService.getMyChannels();
        setChannels(channelsData);
        
        // Buscar playlists do usuário
        const playlistsData = await youtubeService.getMyPlaylists();
        setPlaylists(playlistsData.playlists);
        setFilteredPlaylists(playlistsData.playlists);
        setNextPageToken(playlistsData.nextPageToken);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Ocorreu um erro ao carregar seus dados do YouTube. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

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
      const playlistsData = await youtubeService.getMyPlaylists(nextPageToken);
      const updatedPlaylists = [...playlists, ...playlistsData.playlists];
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
    setVideoSearchResults([]);
    setSearchProgress(0);
    setTotalPlaylistsToSearch(0);
    setSearchStartTime(Date.now());
    
    try {
      // Feedback inicial para o usuário
      const allPlaylists = await youtubeService.getAllPlaylists();
      setTotalPlaylistsToSearch(allPlaylists.length);
      
      // Criar um listener para acompanhar o progresso
      const progressListener = (progress: number, _total: number) => {
        setSearchProgress(progress);
      };
      
      // Adicionar listener antes da pesquisa
      youtubeService.setProgressListener(progressListener);
      
      let results: PlaylistWithFoundVideos[] = [];
      
      // Realizar a pesquisa com base no tipo selecionado
      if (searchType === 'title') {
        results = await youtubeService.searchVideoAcrossPlaylists(searchTerm);
      } else if (searchType === 'id') {
        // Buscar vídeo por ID
        const video = await youtubeService.getVideoById(searchTerm);
        if (video && video.playlists) {
          // Construir resultados no mesmo formato
          results = await Promise.all(video.playlists.map(async (playlist) => {
            const playlistItems = await youtubeService.getPlaylistItems(playlist.id);
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
        const videoByUrl = await youtubeService.getVideoByUrl(searchTerm);
        if (videoByUrl && videoByUrl.playlists) {
          results = await Promise.all(videoByUrl.playlists.map(async (playlist) => {
            const playlistItems = await youtubeService.getPlaylistItems(playlist.id);
            const foundVideo = playlistItems.find(item => item.videoId === videoByUrl.id);
            return {
              playlist,
              foundVideos: foundVideo ? [foundVideo] : []
            };
          }));
          results = results.filter(result => result.foundVideos.length > 0);
        }
      }
      
      // Remover listener após pesquisa
      youtubeService.setProgressListener(null);
      
      // Ordenar resultados por relevância ou título da playlist
      results.sort((a, b) => a.playlist.title.localeCompare(b.playlist.title));
      
      setVideoSearchResults(results);
      
      if (results.length === 0) {
        setError(`Nenhum vídeo encontrado com o termo "${searchTerm}" em suas playlists.`);
      }
    } catch (err) {
      console.error('Erro ao pesquisar vídeos:', err);
      setError('Ocorreu um erro ao pesquisar vídeos nas playlists.');
      // Remover listener em caso de erro
      youtubeService.setProgressListener(null);
    } finally {
      setSearching(false);
      setSearchStartTime(null);
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

  // Calcular tempo estimado restante
  const getEstimatedTimeRemaining = () => {
    if (!searchStartTime || searchProgress === 0) return null;
    
    const elapsedMs = Date.now() - searchStartTime;
    const progressPercent = searchProgress / totalPlaylistsToSearch;
    
    if (progressPercent === 0) return null;
    
    // Estimar tempo total com base no tempo decorrido e progresso atual
    const estimatedTotalMs = elapsedMs / progressPercent;
    const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
    
    if (remainingMs <= 0) return "Finalizando...";
    
    const remainingSec = Math.round(remainingMs / 1000);
    if (remainingSec < 60) return `${remainingSec} segundos`;
    
    const remainingMin = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;
    return `${remainingMin}m ${sec}s`;
  };

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
        
        {/* Seção de Canais */}
        {channels.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 subtle-gradient-text">Meus Canais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map(channel => (
                <div key={channel.id} className="card overflow-hidden hover:shadow-md transition-all duration-300">
                  <div className="flex items-center p-4">
                    <img 
                      src={channel.thumbnailUrl} 
                      alt={channel.title} 
                      className="w-16 h-16 rounded-full mr-4 border-2 border-gray-800"
                    />
                    <div>
                      <h3 className="text-lg font-medium text-white">{channel.title}</h3>
                      {channel.customUrl && (
                        <a 
                          href={`https://youtube.com/${channel.customUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                        >
                          @{channel.customUrl}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Seção de Pesquisa */}
        <section className="mb-8">
          <div className="card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h2 className="text-2xl font-semibold subtle-gradient-text mb-4 md:mb-0">Busca Avançada</h2>
              
              <div className="flex items-center">
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
            
            {/* Indicador de progresso durante a pesquisa */}
            {searching && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-300">
                    Pesquisando em playlists: {searchProgress}/{totalPlaylistsToSearch}
                  </div>
                  <div className="text-sm text-gray-300">
                    {getEstimatedTimeRemaining() ? `Tempo restante: ${getEstimatedTimeRemaining()}` : 'Calculando tempo...'}
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${totalPlaylistsToSearch ? (searchProgress / totalPlaylistsToSearch) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Resultados de pesquisa de vídeos */}
        {searchMode === 'video' && videoSearchResults.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 subtle-gradient-text">Resultados da Pesquisa</h2>
            
            <div className="space-y-6">
              {videoSearchResults.map(result => (
                <div key={result.playlist.id} className="card overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 overflow-hidden rounded-md mr-4">
                          <img 
                            src={result.playlist.thumbnailUrl || '/placeholder-playlist.jpg'} 
                            alt={result.playlist.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">{result.playlist.title}</h3>
                          <p className="text-xs text-gray-400">{result.playlist.itemCount} vídeos • {result.foundVideos.length} resultados</p>
                        </div>
                      </div>
                      
                      <Link
                        to={`/playlist/${result.playlist.id}`}
                        className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors flex items-center"
                      >
                        <span>Ver playlist</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Lista de vídeos encontrados */}
                  <div className="divide-y divide-gray-800">
                    {result.foundVideos.map((video, index) => (
                      <div key={`${video.playlistId}-${video.videoId}-${index}`} className="p-4 hover:bg-[#1a1a1a] transition-colors">
                        <div className="flex items-start">
                          <div className="w-24 h-16 overflow-hidden rounded-md flex-shrink-0 mr-4">
                            <img 
                              src={video.thumbnailUrl || '/placeholder-video.jpg'}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="text-white font-medium line-clamp-1 mb-1">{video.title}</h4>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400 text-xs">
                              {video.viewCount !== undefined && (
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1 text-red-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>{formatNumber(video.viewCount)} visualizações</span>
                                </div>
                              )}
                              
                              {video.likeCount !== undefined && (
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1 text-green-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                                  </svg>
                                  <span>{formatNumber(video.likeCount || 0)}</span>
                                </div>
                              )}
                              
                              {video.lastUpdated && (
                                <div className="flex items-center text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Atualizado: {new Date(video.lastUpdated).toLocaleString('pt-BR', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}&list=${video.playlistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-400 transition-colors flex-shrink-0 ml-3"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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