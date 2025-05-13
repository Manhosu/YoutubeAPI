import { useState } from 'react';
import Layout from '../components/Layout';
import { youtubeService, type YoutubeVideo } from '../services/youtubeService';

type SearchType = 'title' | 'id' | 'url';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('title');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [currentVideo, setCurrentVideo] = useState<YoutubeVideo | null>(null);
  const [playlistViewsEstimate, setPlaylistViewsEstimate] = useState<Record<string, number>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setError('Por favor, insira um termo de busca');
      return;
    }
    
    setLoading(true);
    setError(null);
    setVideos([]);
    setCurrentVideo(null);
    setPlaylistViewsEstimate({});
    
    try {
      let searchResults: YoutubeVideo[] = [];
      
      switch (searchType) {
        case 'title':
          searchResults = await youtubeService.searchVideosByTitle(searchTerm);
          if (searchResults.length === 0) {
            setError(`Nenhum vídeo encontrado com o título "${searchTerm}"`);
          }
          setVideos(searchResults);
          break;
          
        case 'id':
          const videoById = await youtubeService.getVideoById(searchTerm);
          if (videoById) {
            setCurrentVideo(videoById);
            // Calcular estimativa de visualizações por playlist
            if (videoById.id) {
              const viewsEstimate = await youtubeService.calculatePlaylistViewsEstimate(videoById.id);
              setPlaylistViewsEstimate(viewsEstimate);
            }
          } else {
            setError(`Nenhum vídeo encontrado com o ID "${searchTerm}"`);
          }
          break;
          
        case 'url':
          const videoByUrl = await youtubeService.getVideoByUrl(searchTerm);
          if (videoByUrl) {
            setCurrentVideo(videoByUrl);
            // Calcular estimativa de visualizações por playlist
            if (videoByUrl.id) {
              const viewsEstimate = await youtubeService.calculatePlaylistViewsEstimate(videoByUrl.id);
              setPlaylistViewsEstimate(viewsEstimate);
            }
          } else {
            setError(`Nenhum vídeo encontrado para a URL "${searchTerm}"`);
          }
          break;
      }
    } catch (err) {
      console.error('Erro na busca:', err);
      setError('Ocorreu um erro ao buscar o vídeo. Verifique se o termo de busca está correto.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVideoSelect = async (video: YoutubeVideo) => {
    setCurrentVideo(video);
    setLoading(true);
    
    try {
      // Obter detalhes completos do vídeo (incluindo playlists)
      const videoDetails = await youtubeService.getVideoById(video.id);
      
      if (videoDetails) {
        setCurrentVideo(videoDetails);
        // Calcular estimativa de visualizações por playlist
        const viewsEstimate = await youtubeService.calculatePlaylistViewsEstimate(video.id);
        setPlaylistViewsEstimate(viewsEstimate);
      }
    } catch (err) {
      console.error('Erro ao obter detalhes do vídeo:', err);
      setError('Erro ao carregar detalhes completos do vídeo.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  return (
    <Layout>
      <div className="page-transition max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Pesquisar Vídeos</h1>
        
        <div className="card p-6 mb-10">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col">
              <label htmlFor="searchType" className="mb-2 text-gray-300 font-medium">
                Tipo de busca
              </label>
              <div className="flex flex-wrap gap-3">
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
            
            <div className="flex flex-col">
              <label htmlFor="searchTerm" className="mb-2 text-gray-300 font-medium">
                {searchType === 'title' ? 'Título do vídeo' : 
                 searchType === 'id' ? 'ID do vídeo' : 'URL do vídeo'}
              </label>
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  searchType === 'title' ? 'Digite o título do vídeo...' : 
                  searchType === 'id' ? 'Digite o ID do vídeo (ex: dQw4w9WgXcQ)' : 
                  'Digite a URL do vídeo (ex: https://youtu.be/dQw4w9WgXcQ)'
                }
                className="input bg-[#121212] text-white p-3 rounded-md w-full"
              />
            </div>
            
            <div>
              <button 
                type="submit" 
                className="btn-primary py-3 px-6 w-full md:w-auto flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    Pesquisar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-white p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}
        
        {/* Resultados da busca por título */}
        {searchType === 'title' && videos.length > 0 && !currentVideo && (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 subtle-gradient-text">Resultados da busca</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(video => (
                <div 
                  key={video.id} 
                  className="card overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => handleVideoSelect(video)}
                >
                  <div className="relative">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/60 transition-opacity">
                      <div className="bg-red-600 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-white line-clamp-2 mb-1">{video.title}</h3>
                    <p className="text-sm text-gray-400">
                      {formatNumber(video.viewCount)} visualizações
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Exibição detalhada do vídeo selecionado */}
        {currentVideo && (
          <div className="space-y-8">
            <div className="card p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-2/5">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <img 
                      src={currentVideo.thumbnailUrl} 
                      alt={currentVideo.title}
                      className="w-full h-full object-cover"
                    />
                    <a 
                      href={`https://youtube.com/watch?v=${currentVideo.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <div className="bg-red-600 rounded-full p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      </div>
                    </a>
                  </div>
                </div>
                
                <div className="md:w-3/5">
                  <h2 className="text-2xl font-semibold mb-2 text-white">{currentVideo.title}</h2>
                  
                  <div className="flex items-center mb-4">
                    <a 
                      href={`https://youtube.com/channel/${currentVideo.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      {currentVideo.channelTitle}
                    </a>
                  </div>
                  
                  <div className="flex items-center mb-6 text-gray-400 space-x-4">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{formatNumber(currentVideo.viewCount)} visualizações</span>
                    </div>
                    
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                      </svg>
                      <span>
                        {new Date(currentVideo.publishedAt).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 line-clamp-3">{currentVideo.description}</p>
                  
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2">ID do vídeo:</span>
                    <code className="bg-[#1a1a1a] text-gray-300 px-2 py-1 rounded text-sm font-mono">
                      {currentVideo.id}
                    </code>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Playlists onde o vídeo aparece */}
            {currentVideo.playlists && currentVideo.playlists.length > 0 ? (
              <div>
                <h3 className="text-xl font-semibold mb-4 subtle-gradient-text">
                  Este vídeo aparece em {currentVideo.playlists.length} playlists
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentVideo.playlists.map(playlist => (
                    <div key={playlist.id} className="card p-4 overflow-hidden">
                      <div className="flex gap-4">
                        <div className="min-w-[80px] w-20 h-20">
                          <img 
                            src={playlist.thumbnailUrl}
                            alt={playlist.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-white line-clamp-1">{playlist.title}</h4>
                          <p className="text-sm text-gray-400 mb-2">
                            {playlist.itemCount} vídeos
                          </p>
                          
                          {/* Estimativa de visualizações para esta playlist */}
                          {playlistViewsEstimate[playlist.id] && (
                            <div className="mt-2 bg-[#1a1a1a] px-2 py-1 rounded-md inline-flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                              </svg>
                              <span className="text-xs text-gray-300">
                                Estimativa: {formatNumber(playlistViewsEstimate[playlist.id])} views
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-4">
                <p className="text-gray-400">Este vídeo não aparece em nenhuma playlist.</p>
              </div>
            )}
            
            {/* Botão para voltar aos resultados na busca por título */}
            {searchType === 'title' && videos.length > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setCurrentVideo(null)}
                  className="btn-secondary flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Voltar aos resultados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search; 