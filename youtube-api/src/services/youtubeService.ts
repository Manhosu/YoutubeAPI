import { supabase } from '../lib/supabaseClient';

// Interfaces para tipagem
export interface YoutubeChannel {
  id: string;
  title: string;
  thumbnailUrl: string;
  customUrl?: string;
}

export interface YoutubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  itemCount: number;
  channelId: string;
  channelTitle?: string;
  totalViews?: number; // Total de visualizações da playlist
}

export interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  dislikeCount?: number; // YouTube API no longer returns dislikes, but keeping for compatibility
  publishedAt: string;
  lastUpdated?: string; // When the stats were last updated
  playlists?: YoutubePlaylist[];
}

export interface PlaylistVideoItem {
  playlistId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  position: number;
  viewCount?: number; // Visualizações reais do vídeo
  likeCount?: number;
  dislikeCount?: number;
  estimatedViews?: number; // Visualizações estimadas na playlist
  channelTitle?: string;
  publishedAt?: string;
  lastUpdated?: string; // When the stats were last updated
}

// Interface para resultados de pesquisa global em todas as playlists
export interface VideoSearchResult {
  video: PlaylistVideoItem;
  playlists: YoutubePlaylist[];
}

// Interface para resultados agrupados por playlist
export interface PlaylistWithFoundVideos {
  playlist: YoutubePlaylist;
  foundVideos: PlaylistVideoItem[];
}

class YoutubeService {
  // Cache para armazenar temporariamente os dados das playlists
  private playlistCache: Map<string, { data: PlaylistVideoItem[], timestamp: number }> = new Map();
  // Intervalo de atualização (24 horas em milissegundos)
  private readonly REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

  // Obter o token de acesso do usuário logado
  private async getAccessToken(): Promise<string | null> {
    try {
      const session = await supabase.auth.getSession();
      const provider = session?.data?.session?.provider_token;
      
      if (!provider) {
        console.error('Token de acesso não encontrado. O usuário está autenticado?');
        return null;
      }
      
      return provider;
    } catch (error) {
      console.error('Erro ao obter token de acesso:', error);
      return null;
    }
  }

  // Fazer uma requisição para a API do YouTube
  private async fetchFromYoutube(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      throw new Error('Token de acesso não encontrado.');
    }
    
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    
    // Adicionar parâmetros à URL
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro na API do YouTube: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao fazer requisição para a API do YouTube:', error);
      throw error;
    }
  }
  
  // Listar canais do usuário autenticado
  async getMyChannels(): Promise<YoutubeChannel[]> {
    try {
      const data = await this.fetchFromYoutube('channels', {
        'part': 'snippet,contentDetails,statistics',
        'mine': 'true'
      });
      
      return data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.default.url || item.snippet.thumbnails.medium.url,
        customUrl: item.snippet.customUrl
      }));
    } catch (error) {
      console.error('Erro ao obter canais:', error);
      return [];
    }
  }
  
  // Listar playlists do usuário
  async getMyPlaylists(pageToken?: string): Promise<{ playlists: YoutubePlaylist[], nextPageToken?: string }> {
    try {
      const params: Record<string, string> = {
        'part': 'snippet,contentDetails',
        'maxResults': '50',
        'mine': 'true'
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const data = await this.fetchFromYoutube('playlists', params);
      
      const playlists = data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        itemCount: item.contentDetails.itemCount,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle
      }));
      
      return {
        playlists,
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      console.error('Erro ao obter playlists:', error);
      return { playlists: [] };
    }
  }
  
  // Buscar playlists por ID de vídeo
  async getPlaylistsByVideoId(videoId: string): Promise<YoutubePlaylist[]> {
    try {
      // Primeiro obtemos todas as playlists do usuário
      const allPlaylists = await this.getAllPlaylists();
      const playlistsWithVideo: YoutubePlaylist[] = [];
      
      // Para cada playlist, verificamos se o vídeo está presente
      for (const playlist of allPlaylists) {
        const items = await this.getPlaylistItems(playlist.id);
        const videoExists = items.some(item => item.videoId === videoId);
        
        if (videoExists) {
          playlistsWithVideo.push(playlist);
        }
      }
      
      return playlistsWithVideo;
    } catch (error) {
      console.error('Erro ao buscar playlists por ID de vídeo:', error);
      return [];
    }
  }
  
  // Obter todas as playlists (incluindo paginação)
  private async getAllPlaylists(): Promise<YoutubePlaylist[]> {
    let allPlaylists: YoutubePlaylist[] = [];
    let nextPageToken: string | undefined = undefined;
    
    do {
      const result = await this.getMyPlaylists(nextPageToken);
      allPlaylists = [...allPlaylists, ...result.playlists];
      nextPageToken = result.nextPageToken;
    } while (nextPageToken);
    
    return allPlaylists;
  }
  
  // Verificar se os dados de uma playlist precisam ser atualizados
  private needsRefresh(playlistId: string): boolean {
    const cachedData = this.playlistCache.get(playlistId);
    if (!cachedData) return true;
    
    const now = Date.now();
    return (now - cachedData.timestamp) > this.REFRESH_INTERVAL;
  }
  
  // Obter itens de uma playlist com dados de visualização e opção de refresh
  async getPlaylistItems(playlistId: string, pageToken?: string, forceRefresh = false): Promise<PlaylistVideoItem[]> {
    // Verificar se temos dados em cache e se eles ainda são válidos
    if (!forceRefresh && this.playlistCache.has(playlistId) && !this.needsRefresh(playlistId)) {
      console.log(`Usando dados em cache para a playlist ${playlistId}`);
      return this.playlistCache.get(playlistId)!.data;
    }
    
    try {
      const params: Record<string, string> = {
        'part': 'snippet,contentDetails',
        'maxResults': '50',
        'playlistId': playlistId
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const data = await this.fetchFromYoutube('playlistItems', params);
      
      // Mapear os itens básicos
      const items = data.items.map((item: any) => ({
        playlistId: playlistId,
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        position: item.snippet.position,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      }));
      
      // Obter dados completos dos vídeos (incluindo estatísticas) em lotes
      const videoIds = items.map((item: PlaylistVideoItem) => item.videoId).join(',');
      const videoData = await this.fetchFromYoutube('videos', {
        'part': 'statistics,snippet',
        'id': videoIds
      });
      
      // Adicionar contagens de visualizações aos itens da playlist
      const itemsWithStats = items.map((item: PlaylistVideoItem) => {
        const videoStats = videoData.items.find((v: { id: string; statistics: any }) => v.id === item.videoId);
        return {
          ...item,
          viewCount: videoStats ? parseInt(videoStats.statistics.viewCount || '0', 10) : 0,
          likeCount: videoStats ? parseInt(videoStats.statistics.likeCount || '0', 10) : 0,
          dislikeCount: videoStats ? parseInt(videoStats.statistics.dislikeCount || '0', 10) : 0,
          lastUpdated: new Date().toISOString()
        };
      });
      
      // Carregar recursivamente todas as páginas
      let allItems = [...itemsWithStats];
      if (data.nextPageToken) {
        const nextItems = await this.getPlaylistItems(playlistId, data.nextPageToken);
        allItems = [...allItems, ...nextItems];
      }
      
      // Armazenar em cache
      this.playlistCache.set(playlistId, {
        data: allItems,
        timestamp: Date.now()
      });
      
      return allItems;
    } catch (error) {
      console.error(`Erro ao obter itens da playlist ${playlistId}:`, error);
      return [];
    }
  }
  
  // Calcular o total de visualizações de uma playlist
  async getPlaylistTotalViews(playlistId: string): Promise<number> {
    try {
      const items = await this.getPlaylistItems(playlistId);
      return items.reduce((total, video) => total + (video.viewCount || 0), 0);
    } catch (error) {
      console.error(`Erro ao calcular visualizações totais da playlist ${playlistId}:`, error);
      return 0;
    }
  }
  
  // Pesquisar vídeos dentro de uma playlist específica
  async searchVideosInPlaylist(playlistId: string, query: string, searchType: 'title' | 'id' | 'url' = 'title'): Promise<PlaylistVideoItem[]> {
    try {
      const allVideos = await this.getPlaylistItems(playlistId);
      
      switch (searchType) {
        case 'title':
          return allVideos.filter(video => 
            video.title.toLowerCase().includes(query.toLowerCase())
          );
          
        case 'id':
          return allVideos.filter(video => video.videoId === query);
          
        case 'url': {
          const videoId = this.extractVideoIdFromUrl(query);
          return videoId ? allVideos.filter(video => video.videoId === videoId) : [];
        }
          
        default:
          return [];
      }
    } catch (error) {
      console.error(`Erro ao pesquisar vídeos na playlist ${playlistId}:`, error);
      return [];
    }
  }
  
  // Buscar vídeo por ID
  async getVideoById(videoId: string): Promise<YoutubeVideo | null> {
    try {
      const data = await this.fetchFromYoutube('videos', {
        'part': 'snippet,statistics',
        'id': videoId
      });
      
      if (!data.items || data.items.length === 0) {
        return null;
      }
      
      const item = data.items[0];
      const playlists = await this.getPlaylistsByVideoId(videoId);
      
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        viewCount: parseInt(item.statistics.viewCount || '0', 10),
        likeCount: parseInt(item.statistics.likeCount || '0', 10),
        dislikeCount: parseInt(item.statistics.dislikeCount || '0', 10),
        publishedAt: item.snippet.publishedAt,
        lastUpdated: new Date().toISOString(),
        playlists
      };
    } catch (error) {
      console.error('Erro ao obter vídeo por ID:', error);
      return null;
    }
  }
  
  // Buscar vídeo por URL
  async getVideoByUrl(url: string): Promise<YoutubeVideo | null> {
    try {
      // Extrair ID do vídeo da URL
      const videoId = this.extractVideoIdFromUrl(url);
      
      if (!videoId) {
        throw new Error('URL de vídeo inválida');
      }
      
      return await this.getVideoById(videoId);
    } catch (error) {
      console.error('Erro ao obter vídeo por URL:', error);
      return null;
    }
  }
  
  // Buscar vídeos por título
  async searchVideosByTitle(title: string): Promise<YoutubeVideo[]> {
    try {
      const data = await this.fetchFromYoutube('search', {
        'part': 'snippet',
        'maxResults': '10',
        'q': title,
        'type': 'video',
        'forMine': 'true'
      });
      
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      const videos: YoutubeVideo[] = [];
      
      for (const item of data.items) {
        const videoId = item.id.videoId;
        const video = await this.getVideoById(videoId);
        
        if (video) {
          videos.push(video);
        }
      }
      
      return videos;
    } catch (error) {
      console.error('Erro ao buscar vídeos por título:', error);
      return [];
    }
  }
  
  // Pesquisar vídeo em todas as playlists
  async searchVideoAcrossPlaylists(query: string): Promise<PlaylistWithFoundVideos[]> {
    try {
      // Obter todas as playlists do usuário
      const allPlaylists = await this.getAllPlaylists();
      const results: PlaylistWithFoundVideos[] = [];
      
      // Buscar vídeos em cada playlist
      for (const playlist of allPlaylists) {
        const matchingVideos = await this.searchVideosInPlaylist(playlist.id, query);
        
        if (matchingVideos.length > 0) {
          results.push({
            playlist,
            foundVideos: matchingVideos
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Erro ao pesquisar vídeo em todas as playlists:', error);
      return [];
    }
  }
  
  // Calcular estimativa de visualizações por playlist
  async calculatePlaylistViewsEstimate(videoId: string): Promise<Record<string, number>> {
    try {
      const video = await this.getVideoById(videoId);
      
      if (!video || !video.playlists || video.playlists.length === 0) {
        return {};
      }
      
      const totalPlaylists = video.playlists.length;
      const totalViews = video.viewCount;
      const viewsEstimate: Record<string, number> = {};
      
      // Método simples: distribuição proporcional baseada no número de playlists
      // Este é um método muito básico; em produção, seria necessário um algoritmo mais sofisticado
      
      for (const playlist of video.playlists) {
        // Para cada playlist, calculamos uma estimativa básica dividindo as views totais
        // pelo número de playlists onde o vídeo aparece
        viewsEstimate[playlist.id] = Math.round(totalViews / totalPlaylists);
      }
      
      return viewsEstimate;
    } catch (error) {
      console.error('Erro ao calcular estimativa de visualizações:', error);
      return {};
    }
  }
  
  // Extrair ID do vídeo de uma URL do YouTube
  private extractVideoIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // URLs no formato: youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      
      // URLs no formato: youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1);
      }
      
      return null;
    } catch (error) {
      console.error('URL inválida:', error);
      return null;
    }
  }
  
  // Atualizar dados de uma playlist específica
  async refreshPlaylistData(playlistId: string): Promise<PlaylistVideoItem[]> {
    console.log(`Atualizando dados da playlist ${playlistId}`);
    return this.getPlaylistItems(playlistId, undefined, true);
  }
  
  // Agenda a atualização diária de todas as playlists
  async schedulePlaylistUpdates(): Promise<void> {
    try {
      // Obter todas as playlists do usuário
      const { playlists } = await this.getMyPlaylists();
      
      for (const playlist of playlists) {
        await this.refreshPlaylistData(playlist.id);
        console.log(`Playlist ${playlist.id} atualizada com sucesso.`);
      }
      
      console.log(`Todas as playlists foram atualizadas. Próxima atualização em 24 horas.`);
    } catch (error) {
      console.error('Erro ao agendar atualizações de playlists:', error);
    }
  }
}

// Criar e exportar uma instância do serviço
export const youtubeService = new YoutubeService(); 