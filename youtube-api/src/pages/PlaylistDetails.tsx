import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { youtubeService, type YoutubePlaylist, type PlaylistVideoItem } from '../services/youtubeService';

type SearchType = 'title' | 'id' | 'url';

const PlaylistDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<YoutubePlaylist | null>(null);
  const [videos, setVideos] = useState<PlaylistVideoItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<PlaylistVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalViews, setTotalViews] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('title');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchPlaylistData = async (forceRefresh = false) => {
    if (!id) return;
    
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      // Buscar todas as playlists do usuário
      const allPlaylists = await youtubeService.getMyPlaylists();
      
      // Encontrar a playlist específica pelo ID
      const playlistData = allPlaylists.playlists.find(p => p.id === id);
      
      if (!playlistData) {
        setError('Playlist não encontrada.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      setPlaylist(playlistData);
      
      // Buscar os vídeos da playlist (com opção de forçar atualização)
      const playlistItems = await youtubeService.getPlaylistItems(id, undefined, forceRefresh);
      setVideos(playlistItems);
      setFilteredVideos(playlistItems);
      
      // Calcular o total de visualizações
      const views = playlistItems.reduce((total, video) => total + (video.viewCount || 0), 0);
      setTotalViews(views);
    } catch (err) {
      console.error('Erro ao buscar dados da playlist:', err);
      setError('Ocorreu um erro ao carregar os dados da playlist. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchPlaylistData();
  }, [id]);
  
  // Função para atualizar manualmente os dados da playlist
  const handleRefreshData = async () => {
    await fetchPlaylistData(true);
  };
  
  // Handler para pesquisa na playlist
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || !searchTerm.trim()) {
      setFilteredVideos(videos);
      return;
    }
    
    setSearching(true);
    
    try {
      const results = await youtubeService.searchVideosInPlaylist(id, searchTerm, searchType);
      setFilteredVideos(results);
      
      if (results.length === 0) {
        setError(`Nenhum vídeo encontrado com os critérios pesquisados.`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Erro na pesquisa:', err);
      setError('Ocorreu um erro ao pesquisar vídeos na playlist.');
    } finally {
      setSearching(false);
    }
  };
  
  // Limpar pesquisa e mostrar todos os vídeos novamente
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredVideos(videos);
    setError(null);
  };
  
  // Formatar número com separadores de milhar
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  return (
    <Layout>
      <div className="page-transition max-w-6xl mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Carregando dados da playlist...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-white p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}
        
        {playlist && (
          <>
            <div className="mb-10">
              <div className="mb-6 flex justify-between items-center">
                <Link 
                  to="/dashboard" 
                  className="text-red-500 hover:text-red-400 transition-colors flex items-center w-fit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Voltar para playlists
                </Link>
                
                <button
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className="flex items-center gap-2 text-sm text-white bg-[#2a2a2a] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Atualizar dados
                    </>
                  )}
                </button>
              </div>
              
              <div className="card overflow-hidden mb-8">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 p-4">
                    <img 
                      src={playlist.thumbnailUrl || '/placeholder-playlist.jpg'}
                      alt={playlist.title}
                      className="w-full rounded-lg"
                    />
                  </div>
                  
                  <div className="md:w-2/3 p-6">
                    <h1 className="text-3xl font-bold mb-2 gradient-text">{playlist.title}</h1>
                    
                    <div className="flex items-center mb-4">
                      <a 
                        href={`https://youtube.com/channel/${playlist.channelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        {playlist.channelTitle}
                      </a>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mb-6 text-gray-400">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5M7.125 14.25v1.5m0-1.5c0-.621.504-1.125 1.125-1.125M7.125 14.25c0-.621-.504-1.125-1.125-1.125m1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m1.125-1.5c0-.621.504-1.125 1.125-1.125m0 0h7.5c.621 0 1.125.504 1.125 1.125m-8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m1.5-1.5v-1.5m0 1.5v1.5m0-1.5c0 .621.504 1.125 1.125 1.125m-1.5-3.75C8.504 12 9 11.496 9 10.875m1.5 1.125c-.621 0-1.125-.504-1.125-1.125m0 0c0-.621-.504-1.125-1.125-1.125m2.25 0v1.5m7.5-.75v-1.5c0-.621-.504-1.125-1.125-1.125M18 12h-7.5m7.5 0c.621 0 1.125.504 1.125 1.125M18 12c-.621 0-1.125.504-1.125 1.125m1.125 1.5v-1.5m0 1.5v1.5m0-1.5c0 .621-.504 1.125-1.125 1.125m2.25-1.125v-1.5c0-.621-.504-1.125-1.125-1.125M19.125 14.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 14.25v-1.5" />
                        </svg>
                        <span>{formatNumber(playlist.itemCount)} vídeos</span>
                      </div>
                      
                      <div className="flex items-center text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 text-red-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{formatNumber(totalViews)} visualizações totais</span>
                      </div>
                    </div>
                    
                    {/* Informação de última atualização */}
                    {videos.length > 0 && videos[0].lastUpdated && (
                      <div className="mb-6 flex items-center text-gray-400 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Dados atualizados em {new Date(videos[0].lastUpdated).toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-gray-300 mb-6">{playlist.description || 'Sem descrição'}</p>
                    
                    <div className="flex items-center space-x-3">
                      <a 
                        href={`https://youtube.com/playlist?list=${playlist.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        Ver no YouTube
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Formulário de pesquisa na playlist */}
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-medium mb-4 text-white">Pesquisar vídeos nesta playlist</h3>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="searchType" className="sr-only">Tipo de busca</label>
                    <div className="flex flex-wrap gap-2">
                      <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors text-sm ${searchType === 'title' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                        <input
                          type="radio"
                          value="title"
                          checked={searchType === 'title'}
                          onChange={() => setSearchType('title')}
                          className="sr-only"
                        />
                        Título
                      </label>
                      
                      <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors text-sm ${searchType === 'id' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                        <input
                          type="radio"
                          value="id"
                          checked={searchType === 'id'}
                          onChange={() => setSearchType('id')}
                          className="sr-only"
                        />
                        ID
                      </label>
                      
                      <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors text-sm ${searchType === 'url' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}>
                        <input
                          type="radio"
                          value="url"
                          checked={searchType === 'url'}
                          onChange={() => setSearchType('url')}
                          className="sr-only"
                        />
                        URL
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="relative">
                      <input
                        type="text"
                        id="searchTerm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={
                          searchType === 'title' ? 'Digite o título do vídeo...' : 
                          searchType === 'id' ? 'Digite o ID do vídeo...' : 
                          'Cole a URL do vídeo...'
                        }
                        className="bg-[#1f1f1f] text-white px-4 py-2 rounded-md w-full pr-24"
                      />
                      
                      <div className="absolute right-1 top-1">
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="text-gray-400 hover:text-white px-2 py-1 mr-1"
                          >
                            Limpar
                          </button>
                        )}
                        
                        <button 
                          type="submit" 
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                          disabled={searching || !searchTerm.trim()}
                        >
                          {searching ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <h2 className="text-2xl font-semibold mb-6 subtle-gradient-text">
              {filteredVideos.length === videos.length 
                ? 'Vídeos na playlist' 
                : `Resultados (${filteredVideos.length} de ${videos.length})`}
            </h2>
            
            {filteredVideos.length === 0 ? (
              <div className="card p-6">
                <p className="text-gray-400">Nenhum vídeo encontrado nesta playlist.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVideos.map((video, index) => (
                  <div 
                    key={`${video.playlistId}-${video.videoId}-${index}`} 
                    className="card overflow-hidden transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-48 md:w-64 relative">
                        <img 
                          src={video.thumbnailUrl || '/placeholder-video.jpg'}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          #{video.position + 1}
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-medium text-white mb-2 line-clamp-2">{video.title}</h3>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-400 text-sm mb-2">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                              <span>ID: {video.videoId}</span>
                            </div>
                            
                            {video.viewCount !== undefined && (
                              <div className="flex items-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-red-500">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-medium">{formatNumber(video.viewCount)} visualizações</span>
                              </div>
                            )}
                            
                            {video.likeCount !== undefined && (
                              <div className="flex items-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-green-500">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                                </svg>
                                <span className="font-medium">{formatNumber(video.likeCount || 0)}</span>
                              </div>
                            )}
                            
                            {video.lastUpdated && (
                              <div className="flex items-center text-gray-500 text-xs">
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
                        
                        <div className="flex items-center mt-4">
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}&list=${video.playlistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-400 transition-colors flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                            Assistir
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PlaylistDetails; 