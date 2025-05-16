import { supabase } from '../lib/supabase';

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

export interface PlaylistViewStats {
  playlistId: string;
  playlistTitle: string;
  viewCount: number;
  lastUpdated: string;
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
  playlistViews?: PlaylistViewStats[]; // New field to track views per playlist
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
  playlistViews?: PlaylistViewStats[];
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

// Nova interface para estatísticas resumidas de playlist
export interface PlaylistStats {
  playlistId: string;
  totalViews: number;
  lastUpdated: string;
}

class YoutubeService {
  // Cache para armazenar temporariamente os dados das playlists e outros recursos
  private playlistCache: Map<string, { data: PlaylistVideoItem[], timestamp: number }> = new Map();
  private channelsCache: { data: YoutubeChannel[], timestamp: number } | null = null;
  private myPlaylistsCache: { playlists: YoutubePlaylist[], nextPageToken?: string, timestamp: number } | null = null;
  private videoCache: Map<string, { data: YoutubeVideo, timestamp: number }> = new Map();
  
  // Cache específico por conta (userId -> cache)
  private accountPlaylistCache: Map<string, Map<string, { data: PlaylistVideoItem[], timestamp: number }>> = new Map();
  private accountChannelsCache: Map<string, { data: YoutubeChannel[], timestamp: number }> = new Map();
  private accountPlaylistsCache: Map<string, { playlists: YoutubePlaylist[], nextPageToken?: string, timestamp: number }> = new Map();
  
  // Mapeamento de token para userId
  private tokenToUserIdMap: Map<string, string> = new Map();
  
  // Intervalo de atualização (aumentado para 48 horas para economizar quotas)
  private readonly REFRESH_INTERVAL = 48 * 60 * 60 * 1000;
  
  // Limite máximo de IDs por requisição em batch
  private readonly MAX_BATCH_SIZE = 50;

  // Obter o token de acesso do usuário logado ou usar um token específico
  private async getAccessToken(providedToken?: string): Promise<string | null> {
    try {
      // Se um token específico for fornecido, usá-lo
      if (providedToken) {
        return providedToken;
      }
      
      // Caso contrário, buscar o token da sessão atual
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

  // Fazer uma requisição para a API do YouTube com token opcional
  private async fetchFromYoutube(endpoint: string, params: Record<string, string> = {}, providedToken?: string): Promise<any> {
    const accessToken = await this.getAccessToken(providedToken);
    
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
        console.error(`API YouTube respondeu com status: ${response.status} ${response.statusText}`);
        const responseText = await response.text().catch(() => 'Não foi possível ler o corpo da resposta');
        console.error(`Detalhes da resposta:`, responseText);
        throw new Error(`Erro na API do YouTube: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao fazer requisição para a API do YouTube:', error);
      throw error;
    }
  }
  
  // Verificar se os dados em cache precisam ser atualizados
  private needsRefresh(timestamp: number): boolean {
    if (!timestamp) return true;
    const now = Date.now();
    return (now - timestamp) > this.REFRESH_INTERVAL;
  }
  
  // Obter o cache específico de uma conta ou o cache padrão
  private getAccountSpecificCache<T>(
    accountId: string | undefined, 
    accountCacheMap: Map<string, T>, 
    defaultCache: T
  ): T {
    if (accountId && accountCacheMap.has(accountId)) {
      return accountCacheMap.get(accountId)!;
    }
    return defaultCache;
  }
  
  // Listar canais do usuário autenticado (com cache)
  async getMyChannels(accountId?: string, providedToken?: string): Promise<YoutubeChannel[]> {
    try {
      // Verificar cache por conta específica
      if (accountId && this.accountChannelsCache.has(accountId)) {
        const cache = this.accountChannelsCache.get(accountId)!;
        if (!this.needsRefresh(cache.timestamp)) {
          console.log('Usando dados em cache para canais da conta:', accountId);
          return cache.data;
        }
      } else if (!accountId && this.channelsCache && !this.needsRefresh(this.channelsCache.timestamp)) {
        console.log('Usando dados em cache para canais');
        return this.channelsCache.data;
      }
      
      const data = await this.fetchFromYoutube('channels', {
        'part': 'snippet,contentDetails',
        'mine': 'true'
      }, providedToken);
      
      const channels = data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.default?.url || item.snippet.thumbnails.medium?.url,
        customUrl: item.snippet.customUrl
      }));
      
      // Armazenar em cache (específico por conta ou cache padrão)
      if (accountId) {
        this.accountChannelsCache.set(accountId, {
          data: channels,
          timestamp: Date.now()
        });
        
        // Se um token específico foi fornecido, mapeá-lo ao accountId
        if (providedToken) {
          this.tokenToUserIdMap.set(providedToken, accountId);
        }
      } else {
        this.channelsCache = {
          data: channels,
          timestamp: Date.now()
        };
      }
      
      return channels;
    } catch (error) {
      console.error('Erro ao obter canais:', error);
      // Se houver erro mas tivermos dados em cache, retornar os dados em cache mesmo que antigos
      if (accountId && this.accountChannelsCache.has(accountId)) {
        console.log('Retornando dados em cache antigos para canais da conta:', accountId);
        return this.accountChannelsCache.get(accountId)!.data;
      } else if (this.channelsCache) {
        console.log('Retornando dados em cache antigos para canais devido a erro');
        return this.channelsCache.data;
      }
      return [];
    }
  }
  
  // Listar playlists do usuário (com cache otimizado)
  async getMyPlaylists(pageToken?: string, accountId?: string, providedToken?: string): Promise<{ playlists: YoutubePlaylist[], nextPageToken?: string }> {
    try {
      // Verificar cache específico por conta ou cache padrão
      if (!pageToken) {
        if (accountId && this.accountPlaylistsCache.has(accountId)) {
          const cache = this.accountPlaylistsCache.get(accountId)!;
          if (!this.needsRefresh(cache.timestamp)) {
            console.log('Usando dados em cache para playlists da conta:', accountId);
            return {
              playlists: cache.playlists,
              nextPageToken: cache.nextPageToken
            };
          }
        } else if (!accountId && this.myPlaylistsCache && !this.needsRefresh(this.myPlaylistsCache.timestamp)) {
          console.log('Usando dados em cache para playlists');
          return {
            playlists: this.myPlaylistsCache.playlists,
            nextPageToken: this.myPlaylistsCache.nextPageToken
          };
        }
      }
      
      const params: Record<string, string> = {
        'part': 'snippet,contentDetails',
        'maxResults': '50', // Máximo permitido pela API do YouTube
        'mine': 'true'
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const data = await this.fetchFromYoutube('playlists', params, providedToken);
      
      const playlists = data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        itemCount: item.contentDetails.itemCount,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle
      }));
      
      // Se for página subsequente, buscar as playlists anteriores para acumular
      let allPlaylists = [...playlists];
      if (pageToken) {
        if (accountId && this.accountPlaylistsCache.has(accountId)) {
          // Obter playlists anteriores do cache específico por conta
          const previousPlaylists = this.accountPlaylistsCache.get(accountId)!.playlists;
          allPlaylists = [...previousPlaylists, ...playlists];
        } else if (this.myPlaylistsCache) {
          // Obter playlists anteriores do cache padrão
          const previousPlaylists = this.myPlaylistsCache.playlists;
          allPlaylists = [...previousPlaylists, ...playlists];
        }
      }
      
      // Atualizar cache com todas as playlists acumuladas
      const cacheEntry = {
        playlists: allPlaylists,
        nextPageToken: data.nextPageToken,
        timestamp: Date.now()
      };
      
      if (accountId) {
        this.accountPlaylistsCache.set(accountId, cacheEntry);
        
        // Se um token específico foi fornecido, mapeá-lo ao accountId
        if (providedToken) {
          this.tokenToUserIdMap.set(providedToken, accountId);
        }
      } else {
        this.myPlaylistsCache = cacheEntry;
      }
      
      // Para a resposta, se for paginação, retornar apenas as novas playlists
      // para que o cliente possa acumulá-las corretamente
      return {
        playlists: pageToken ? playlists : allPlaylists,
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      console.error('Erro ao obter playlists:', error);
      // Se houver erro mas tivermos dados em cache, retornar os dados em cache mesmo que antigos
      if (!pageToken) {
        if (accountId && this.accountPlaylistsCache.has(accountId)) {
          console.log('Retornando dados em cache antigos para playlists da conta:', accountId);
          const cache = this.accountPlaylistsCache.get(accountId)!;
          return {
            playlists: cache.playlists,
            nextPageToken: cache.nextPageToken
          };
        } else if (this.myPlaylistsCache) {
          console.log('Retornando dados em cache antigos para playlists devido a erro');
          return {
            playlists: this.myPlaylistsCache.playlists,
            nextPageToken: this.myPlaylistsCache.nextPageToken
          };
        }
      }
      return { playlists: [] };
    }
  }
  
  // Obter dados de múltiplas contas para gerar relatório consolidado
  async getConsolidatedData(accountIds: string[]): Promise<{
    channels: YoutubeChannel[],
    playlists: YoutubePlaylist[],
    totalVideos: number,
    totalViews: number
  }> {
    const channels: YoutubeChannel[] = [];
    const playlists: YoutubePlaylist[] = [];
    let totalVideos = 0;
    let totalViews = 0;
    
    console.log(`Gerando relatório consolidado para ${accountIds.length} contas:`, accountIds);
    
    // Se nenhuma conta for fornecida, usar todas as contas disponíveis
    if (accountIds.length === 0) {
      try {
        // Tentar obter contas do localStorage
        const accountsJson = localStorage.getItem('youtube_analyzer_accounts');
        if (accountsJson) {
          const accounts = JSON.parse(accountsJson);
          accountIds = accounts.map((acc: any) => acc.id);
          console.log('Usando todas as contas disponíveis:', accountIds);
        }
      } catch (error) {
        console.error('Erro ao obter contas do localStorage:', error);
      }
    }
    
    // Obter dados de cada conta
    for (const accountId of accountIds) {
      try {
        console.log(`Buscando dados para conta ${accountId}...`);
        
        // Obter canais
        const accountChannels = await this.getMyChannels(accountId);
        channels.push(...accountChannels);
        
        // Obter playlists
        const { playlists: accountPlaylists } = await this.getMyPlaylists(undefined, accountId);
        
        console.log(`Encontradas ${accountPlaylists.length} playlists para a conta ${accountId}`);
        
        // Calcular estatísticas para cada playlist
        for (const playlist of accountPlaylists) {
          // Incrementar contador de vídeos
          totalVideos += playlist.itemCount;
          
          // Tentar obter visualizações da playlist
          try {
            console.log(`Buscando itens da playlist ${playlist.id}...`);
            
            // Forçar atualização para obter os dados mais recentes
            const playlistItems = await this.getPlaylistItems(playlist.id, undefined, true, accountId);
            
            // Somar visualizações
            const playlistViews = playlistItems.reduce((sum, item) => {
              const views = item.viewCount || 0;
              if (views > 0) {
                console.log(`Vídeo ${item.videoId}: ${views} visualizações`);
              }
              return sum + views;
            }, 0);
            
            console.log(`Playlist ${playlist.id} tem ${playlistViews} visualizações totais`);
            totalViews += playlistViews;
            
            // Adicionar dado de visualizações à playlist
            playlist.totalViews = playlistViews;
          } catch (error) {
            console.error(`Erro ao obter estatísticas da playlist ${playlist.id}:`, error);
          }
        }
        
        playlists.push(...accountPlaylists);
      } catch (error) {
        console.error(`Erro ao obter dados da conta ${accountId}:`, error);
      }
    }
    
    console.log(`Relatório consolidado: ${totalVideos} vídeos, ${totalViews} visualizações totais`);
    
    return {
      channels,
      playlists,
      totalVideos,
      totalViews
    };
  }
  
  // Método para obter uma playlist específica pelo ID
  async getPlaylistById(playlistId: string, accountId?: string): Promise<YoutubePlaylist | null> {
    try {
      console.log(`Buscando playlist ${playlistId} diretamente...`);
      // Obter token de acesso específico da conta, se fornecido
      let token;
      if (accountId) {
        // Tentar buscar o token do mapeamento ou da sessão
        const accounts = JSON.parse(localStorage.getItem('youtube_analyzer_accounts') || '[]');
        const account = accounts.find((acc: any) => acc.id === accountId);
        if (account && account.providerToken) {
          token = account.providerToken;
        } else {
          // Se não encontrar o token no localStorage, buscar da sessão
          try {
            const session = await supabase.auth.getSession();
            token = session?.data?.session?.provider_token;
            console.log('Usando token da sessão atual');
          } catch (error) {
            console.error('Erro ao obter token da sessão:', error);
          }
        }
      }
      
      // Parâmetros para a requisição
      const params: Record<string, string> = {
        'part': 'snippet,contentDetails',
        'id': playlistId
      };
      
      // Fazer a requisição com o token apropriado
      const data = await this.fetchFromYoutube('playlists', params, token);
      
      if (!data.items || data.items.length === 0) {
        console.log(`Playlist ${playlistId} não encontrada via API`);
        return null;
      }
      
      const playlistData = data.items[0];
      
      // Converter para o formato da nossa interface
      const playlist: YoutubePlaylist = {
        id: playlistData.id,
        title: playlistData.snippet.title,
        description: playlistData.snippet.description || '',
        thumbnailUrl: 
          playlistData.snippet.thumbnails?.high?.url || 
          playlistData.snippet.thumbnails?.medium?.url || 
          playlistData.snippet.thumbnails?.default?.url,
        itemCount: playlistData.contentDetails.itemCount,
        channelId: playlistData.snippet.channelId,
        channelTitle: playlistData.snippet.channelTitle
      };
      
      console.log(`Playlist ${playlistId} encontrada:`, playlist.title);
      return playlist;
    } catch (error) {
      console.error(`Erro ao buscar playlist ${playlistId}:`, error);
      return null;
    }
  }
  
  // Método para buscar vídeos em uma playlist específica
  async searchVideosInPlaylist(
    playlistId: string,
    searchTerm: string,
    searchType: 'title' | 'id' | 'url' = 'title',
    accountId?: string
  ): Promise<PlaylistVideoItem[]> {
    try {
      // Primeiro, obter todos os itens da playlist
      const allItems = await this.getPlaylistItems(playlistId, undefined, false, accountId);
      
      if (searchType === 'title') {
        // Pesquisar por título (insensível a maiúsculas/minúsculas e acentos)
        const normalizedTerm = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return allItems.filter(item => {
          const normalizedTitle = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return normalizedTitle.includes(normalizedTerm);
        });
      } else if (searchType === 'id') {
        // Pesquisar por ID exato
        return allItems.filter(item => item.videoId === searchTerm);
      } else if (searchType === 'url') {
        // Extrair ID do vídeo da URL e pesquisar
        const videoId = this.extractVideoId(searchTerm);
        if (!videoId) return [];
        
        return allItems.filter(item => item.videoId === videoId);
      }
      
      return [];
    } catch (error) {
      console.error(`Erro ao pesquisar vídeos na playlist ${playlistId}:`, error);
      return [];
    }
  }
  
  // Método auxiliar para extrair o ID do vídeo de uma URL do YouTube
  private extractVideoId(url: string): string | null {
    try {
      // Padrões comuns de URL do YouTube
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=|youtube\.com\/watch\?.*&v=)([^&\?#]+)/,
        /youtube\.com\/watch\?.*&v=([^&\?#]+)/,
        /youtube\.com\/shorts\/([^&\?#]+)/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao extrair ID do vídeo da URL:', error);
      return null;
    }
  }

  // Método para limpar cache específico de uma conta
  clearCache(accountId?: string): void {
    if (accountId) {
      console.log(`Limpando cache para a conta ${accountId}`);
      this.accountChannelsCache.delete(accountId);
      this.accountPlaylistsCache.delete(accountId);
      this.accountPlaylistCache.delete(accountId);
    } else {
      console.log('Limpando todo o cache');
      this.channelsCache = null;
      this.myPlaylistsCache = null;
      this.playlistCache.clear();
      this.videoCache.clear();
    }
    
    // Persistir alterações
    this.persistCache();
  }
  
  // Método para obter itens de uma playlist com estatísticas
  async getPlaylistItems(
    playlistId: string,
    pageToken?: string,
    forceRefresh = false,
    accountId?: string,
    providedToken?: string
  ): Promise<PlaylistVideoItem[]> {
    try {
      // Check cache first
      const cacheKey = `playlist_${playlistId}`;
      const cachedItems = this.playlistCache.get(cacheKey);
      if (!forceRefresh && cachedItems && Date.now() - cachedItems.timestamp < this.REFRESH_INTERVAL) {
        return cachedItems.data;
      }

      const allItems: PlaylistVideoItem[] = [];
      let nextPageToken = pageToken;

      do {
        // Get playlist items from YouTube API
        const params: Record<string, string> = {
          'part': 'snippet,contentDetails',
          'maxResults': '50',
          'playlistId': playlistId
        };
        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const data = await this.fetchFromYoutube('playlistItems', params, providedToken);
        
        if (!data.items || data.items.length === 0) break;

        // Get video IDs for batch request
        const videoIds = data.items.map((item: any) => item.contentDetails.videoId).join(',');
        
        // Get video details in batch
        const videoParams: Record<string, string> = {
          'part': 'statistics,snippet',
          'id': videoIds
        };
        const videoData = await this.fetchFromYoutube('videos', videoParams, providedToken);
        const videoMap = new Map(videoData.items.map((item: any) => [item.id, item]));

        // Process each playlist item
        for (const item of data.items) {
          const videoId = item.contentDetails.videoId;
          const videoDetails = videoMap.get(videoId);
          
          if (videoDetails) {
            allItems.push({
              playlistId,
              videoId,
              title: item.snippet.title,
              thumbnailUrl: 
                item.snippet.thumbnails?.high?.url || 
                item.snippet.thumbnails?.medium?.url || 
                item.snippet.thumbnails?.default?.url,
              position: item.snippet.position,
              viewCount: parseInt(videoDetails.statistics.viewCount) || 0,
              likeCount: parseInt(videoDetails.statistics.likeCount) || 0,
              channelTitle: videoDetails.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              lastUpdated: new Date().toISOString()
            });
          }
        }

        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      // Store in cache
      this.playlistCache.set(cacheKey, {
        data: allItems,
        timestamp: Date.now()
      });

      return allItems;
    } catch (error) {
      console.error(`Erro ao buscar itens da playlist ${playlistId}:`, error);
      return [];
    }
  }
  
  // Método auxiliar para adicionar estatísticas aos vídeos de uma playlist
  private async addVideoStatistics(
    items: PlaylistVideoItem[], 
    accountId?: string,
    providedToken?: string
  ): Promise<void> {
    try {
      // Processar em lotes do tamanho máximo permitido
      for (let i = 0; i < items.length; i += this.MAX_BATCH_SIZE) {
        const batch = items.slice(i, i + this.MAX_BATCH_SIZE);
        const videoIds = batch.map(item => item.videoId).join(',');
        
        // Parâmetros para a requisição
        const params: Record<string, string> = {
          'part': 'statistics',
          'id': videoIds
        };
        
        // Obter token de acesso específico da conta, se fornecido
        let token = providedToken;
        if (!token && accountId) {
          // Tentar buscar o token do mapeamento ou da sessão
          const accounts = JSON.parse(localStorage.getItem('youtube_analyzer_accounts') || '[]');
          const account = accounts.find((acc: any) => acc.id === accountId);
          if (account && account.providerToken) {
            token = account.providerToken;
          }
        }
        
        // Fazer a requisição com o token apropriado
        const data = await this.fetchFromYoutube('videos', params, token);
        
        // Associar estatísticas aos itens correspondentes
        data.items.forEach((videoData: any) => {
          const videoId = videoData.id;
          const stats = videoData.statistics;
          
          // Encontrar todos os itens com este ID de vídeo
          const matchingItems = batch.filter(item => item.videoId === videoId);
          
          matchingItems.forEach(item => {
            item.viewCount = parseInt(stats.viewCount) || 0;
            item.likeCount = parseInt(stats.likeCount) || 0;
            item.dislikeCount = parseInt(stats.dislikeCount) || 0; // YouTube API não fornece mais
            item.lastUpdated = new Date().toISOString();
          });
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar estatísticas aos vídeos:', error);
      // Continuar sem estatísticas em caso de erro
    }
  }

  // Gerar relatório combinado para exportação
  async generateConsolidatedReport(
    accountIds: string[], 
    isGrowthReport = false, 
    dateRange?: { startDate: string; endDate: string }
  ): Promise<any> {
    const data = await this.getConsolidatedData(accountIds);
    
    // Relatório básico padrão
    const baseReport = {
      reportDate: new Date().toISOString(),
      summary: {
        totalAccounts: accountIds.length,
        totalChannels: data.channels.length,
        totalPlaylists: data.playlists.length,
        totalVideos: data.totalVideos,
        totalViews: data.totalViews
      },
      channels: data.channels.map(channel => ({
        id: channel.id,
        title: channel.title,
        customUrl: channel.customUrl || ''
      })),
      playlists: data.playlists.map(playlist => ({
        id: playlist.id,
        title: playlist.title,
        channelId: playlist.channelId,
        channelTitle: playlist.channelTitle,
        itemCount: playlist.itemCount,
        totalViews: playlist.totalViews || 0
      }))
    };
    
    // Se não for relatório de crescimento, retorna o padrão
    if (!isGrowthReport) {
      return baseReport;
    }
    
    // Para relatório de crescimento, adiciona métricas adicionais
    try {
      // Datas do intervalo (usar as fornecidas ou padrão de 30 dias)
      const startDate = dateRange ? new Date(dateRange.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange ? new Date(dateRange.endDate) : new Date();
      
      // Calcular duração do período em dias
      const periodDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Gerar dados de crescimento por canal
      const channelGrowthData = data.channels.map(channel => {
        // Dados simulados para visualizações dos canais (em ambiente real, obter da API)
        const viewsStart = Math.floor(Math.random() * 50000) + 5000;
        const viewsEnd = viewsStart * (1 + (Math.random() * 0.4 - 0.1)); // -10% a +30% de crescimento
        const growthPercentage = ((viewsEnd - viewsStart) / viewsStart) * 100;
        
        // Dados simulados para inscritos
        const subscribersStart = Math.floor(Math.random() * 5000) + 500;
        const subscribersEnd = subscribersStart * (1 + (Math.random() * 0.35 - 0.05)); // -5% a +30% de crescimento
        
        return {
          id: channel.id,
          title: channel.title,
          views: Math.round(viewsEnd - viewsStart), // visualizações ganhas no período
          subscribers: Math.round(subscribersEnd - subscribersStart), // inscritos ganhos no período
          growthPercentage: parseFloat(growthPercentage.toFixed(2)),
          customUrl: channel.customUrl || ''
        };
      });
      
      // Ordenar canais por crescimento percentual
      const sortedChannels = [...channelGrowthData].sort((a, b) => b.growthPercentage - a.growthPercentage);
      
      // Calcular crescimento e tendências para o período personalizado
      const customGrowthData = {
        views: channelGrowthData.reduce((sum, channel) => sum + channel.views, 0),
        subscribers: channelGrowthData.reduce((sum, channel) => sum + channel.subscribers, 0),
        percentageViews: parseFloat(
          ((channelGrowthData.reduce((sum, ch) => sum + ch.views, 0) / data.totalViews) * 100).toFixed(2)
        ) || 0,
        percentageSubscribers: parseFloat(
          ((channelGrowthData.reduce((sum, ch) => sum + ch.subscribers, 0) / 
            (data.channels.length * 1000)) * 100).toFixed(2) // Valor base simulado de 1000 inscritos por canal
        ) || 0
      };
      
      // Gerar dados de vídeos em alta (simulados, em ambiente real obter da API)
      const topVideos = Array.from({ length: 5 }, (_, i) => ({
        id: `video${i + 1}`,
        title: `Vídeo em alta ${i + 1}`,
        views: Math.floor(Math.random() * 15000) + 5000,
        growthPercentage: Math.floor(Math.random() * 40) + 10
      })).sort((a, b) => b.growthPercentage - a.growthPercentage);
      
      // Playlists em alta (simuladas)
      const topPlaylists = Array.from({ length: 5 }, (_, i) => ({
        id: `playlist${i + 1}`,
        title: `Playlist em alta ${i + 1}`,
        views: Math.floor(Math.random() * 25000) + 10000,
        growthPercentage: Math.floor(Math.random() * 35) + 12
      })).sort((a, b) => b.growthPercentage - a.growthPercentage);
      
      // Gerar dados de tendências mensais
      const generateMonthlyTrends = () => {
        // Determinar quantos meses mostrar com base no período
        let monthCount = Math.ceil(periodDuration / 30);
        monthCount = Math.min(Math.max(monthCount, 3), 6); // Pelo menos 3, no máximo 6
        
        // Obter meses anteriores
        const months = [];
        const currentDate = new Date(endDate);
        
        // Se o período for grande, gerar dados mensais, senão semanais
        const isMonthly = periodDuration > 60;
        const periodName = isMonthly ? 'month' : 'week';
        const periodDays = isMonthly ? 30 : 7;
        
        for (let i = 0; i < monthCount; i++) {
          const monthDate = new Date(currentDate);
          monthDate.setDate(monthDate.getDate() - (i * periodDays));
          
          // Nome do mês ou semana
          let label;
          if (isMonthly) {
            // Formato: "Jan/23"
            label = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            // Capitalize a primeira letra
            label = label.charAt(0).toUpperCase() + label.slice(1);
          } else {
            // Formato para semanas: "6-12 Jun"
            const weekStart = new Date(monthDate);
            weekStart.setDate(weekStart.getDate() - 6);
            label = `${weekStart.getDate()}-${monthDate.getDate()} ${monthDate.toLocaleDateString('pt-BR', { month: 'short' })}`;
          }
          
          // Dados simulados
          const viewsBase = 10000 + (i * 2000); // Mais views em meses mais recentes
          const subscribersBase = 200 + (i * 50);
          
          // Adicionar variação para não ser linear demais
          const variation = Math.random() * 0.3 + 0.85; // 0.85 a 1.15
          
          months.push({
            month: label,
            views: Math.round(viewsBase * variation),
            subscribers: Math.round(subscribersBase * variation)
          });
        }
        
        // Inverter para ordem cronológica (mais antigo primeiro)
        return months.reverse();
      };
      
      const growthReport = {
        ...baseReport,
        reportType: 'growth',
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        growth: {
          lastMonth: {
            views: Math.floor(Math.random() * 50000) + 5000,
            subscribers: Math.floor(Math.random() * 1000) + 100,
            percentageViews: Math.round((Math.random() * 30) - 10), // Pode ser negativo
            percentageSubscribers: Math.round((Math.random() * 25) - 5)
          },
          lastQuarter: {
            views: Math.floor(Math.random() * 150000) + 15000,
            subscribers: Math.floor(Math.random() * 3000) + 300,
            percentageViews: Math.round((Math.random() * 45) - 15),
            percentageSubscribers: Math.round((Math.random() * 40) - 10)
          },
          // Dados personalizados para o período selecionado
          custom: customGrowthData
        },
        topPerformers: {
          channels: sortedChannels,
          videos: topVideos,
          playlists: topPlaylists
        },
        // Adicionar tendências por período
        trends: {
          monthly: generateMonthlyTrends()
        }
      };
      
      return growthReport;
    } catch (error) {
      console.error('Erro ao calcular dados de crescimento:', error);
      // Em caso de erro, retorna o relatório básico
      return baseReport;
    }
  }
  
  // Exportar relatório consolidado
  async exportConsolidatedReport(
    accountIds: string[], 
    format: 'csv' | 'json' = 'json', 
    isGrowthReport = false,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<string | object> {
    try {
      const reportData = await this.generateConsolidatedReport(accountIds, isGrowthReport, dateRange);
      
      // Retornar no formato solicitado
      if (format === 'csv') {
        return this.convertReportToCSV(reportData);
      }
      return reportData;
    } catch (error) {
      console.error('Erro ao exportar relatório consolidado:', error);
      throw error;
    }
  }
  
  // Converter relatório para CSV
  private convertReportToCSV(reportData: any): string {
    // Implementação simplificada, expanda conforme necessário
    let csv = '';
    
    // Adicionar cabeçalho do relatório
    csv += `Relatório gerado em,${reportData.reportDate}\n`;
    if (reportData.reportType === 'growth') {
      csv += 'Tipo de relatório,Crescimento\n';
      if (reportData.dateRange) {
        csv += `Período de análise,${new Date(reportData.dateRange.startDate).toLocaleDateString('pt-BR')} a ${new Date(reportData.dateRange.endDate).toLocaleDateString('pt-BR')}\n`;
      }
      csv += '\n';
    } else {
      csv += 'Tipo de relatório,Padrão\n\n';
    }
    
    // Adicionar informações gerais
    if (reportData.summary) {
      csv += 'RESUMO,\n';
      csv += `Total de Contas,${reportData.summary.totalAccounts}\n`;
      csv += `Total de Canais,${reportData.summary.totalChannels}\n`;
      csv += `Total de Playlists,${reportData.summary.totalPlaylists}\n`;
      csv += `Total de Vídeos,${reportData.summary.totalVideos}\n`;
      csv += `Total de Visualizações,${reportData.summary.totalViews}\n\n`;
    }
    
    // Adicionar dados de crescimento se for relatório de crescimento
    if (reportData.reportType === 'growth' && reportData.growth) {
      csv += 'CRESCIMENTO,\n';
      csv += 'Período,Visualizações,Crescimento %,Inscritos,Crescimento %\n';
      csv += `Último mês,${reportData.growth.lastMonth.views},${reportData.growth.lastMonth.percentageViews}%,` + 
             `${reportData.growth.lastMonth.subscribers},${reportData.growth.lastMonth.percentageSubscribers}%\n`;
      csv += `Último trimestre,${reportData.growth.lastQuarter.views},${reportData.growth.lastQuarter.percentageViews}%,` +
             `${reportData.growth.lastQuarter.subscribers},${reportData.growth.lastQuarter.percentageSubscribers}%\n`;
      
      // Adicionar dados do período personalizado se disponíveis
      if (reportData.growth.custom) {
        csv += `Período selecionado,${reportData.growth.custom.views},${reportData.growth.custom.percentageViews}%,` +
               `${reportData.growth.custom.subscribers},${reportData.growth.custom.percentageSubscribers}%\n`;
      }
      csv += '\n';
             
      // Adicionar canais com crescimento
      if (reportData.topPerformers && reportData.topPerformers.channels) {
        csv += 'CANAIS COM MAIOR CRESCIMENTO,\n';
        csv += 'Título,URL Personalizada,Visualizações,Inscritos,Crescimento %\n';
        reportData.topPerformers.channels.forEach((channel: any) => {
          csv += `${this.escapeCsvValue(channel.title)},${channel.customUrl || ''},${channel.views},${channel.subscribers || 0},${channel.growthPercentage}%\n`;
        });
        csv += '\n';
      }
      
      // Adicionar top performers
      if (reportData.topPerformers) {
        csv += 'TOP VÍDEOS,\n';
        csv += 'ID,Título,Visualizações,Crescimento %\n';
        reportData.topPerformers.videos.forEach((video: any) => {
          csv += `${video.id},${this.escapeCsvValue(video.title)},${video.views},${video.growthPercentage}%\n`;
        });
        csv += '\n';
        
        csv += 'TOP PLAYLISTS,\n';
        csv += 'ID,Título,Visualizações,Crescimento %\n';
        reportData.topPerformers.playlists.forEach((playlist: any) => {
          csv += `${playlist.id},${this.escapeCsvValue(playlist.title)},${playlist.views},${playlist.growthPercentage}%\n`;
        });
        csv += '\n';
      }
      
      // Adicionar tendências mensais
      if (reportData.trends && reportData.trends.monthly) {
        csv += 'TENDÊNCIAS TEMPORAIS,\n';
        csv += 'Período,Visualizações,Inscritos\n';
        reportData.trends.monthly.forEach((month: any) => {
          csv += `${month.month},${month.views},${month.subscribers}\n`;
        });
        csv += '\n';
      }
    }
    
    // Adicionar canais
    csv += 'CANAIS,\n';
    csv += 'ID,Título,URL Personalizada\n';
    reportData.channels.forEach((channel: any) => {
      csv += `${channel.id},${this.escapeCsvValue(channel.title)},${channel.customUrl || ''}\n`;
    });
    csv += '\n';
    
    // Adicionar playlists
    csv += 'PLAYLISTS,\n';
    csv += 'ID,Título,Canal,Vídeos,Visualizações\n';
    reportData.playlists
      .sort((a: any, b: any) => b.totalViews - a.totalViews)
      .forEach((playlist: any) => {
        csv += `${playlist.id},${this.escapeCsvValue(playlist.title)},${this.escapeCsvValue(playlist.channelTitle || '')},${playlist.itemCount},${playlist.totalViews || 0}\n`;
      });
    
    return csv;
  }
  
  // Escapar valores para CSV
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    // Escapar aspas duplicando-as e envolver em aspas se contiver vírgula, aspas ou quebras de linha
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Carregar cache do localStorage
  private loadCache(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        console.log('Carregando cache do YouTube do localStorage');
        
        // Carregar cache dos canais
        const channelsCache = localStorage.getItem('yt_channels_cache');
        if (channelsCache) {
          try {
            const parsed = JSON.parse(channelsCache);
            this.channelsCache = {
              data: parsed.data || [],
              timestamp: parsed.timestamp || 0
            };
            console.log('Cache de canais carregado');
          } catch (e) {
            console.error('Erro ao processar cache de canais:', e);
          }
        }
        
        // Carregar cache das playlists
        const playlistsCache = localStorage.getItem('yt_playlists_cache');
        if (playlistsCache) {
          try {
            const parsed = JSON.parse(playlistsCache);
            this.myPlaylistsCache = {
              playlists: parsed.playlists || [],
              nextPageToken: parsed.nextPageToken,
              timestamp: parsed.timestamp || 0
            };
            console.log('Cache de playlists carregado');
          } catch (e) {
            console.error('Erro ao processar cache de playlists:', e);
          }
        }
        
        // Carregar cache de playlists específicas
        const playlistItemsCache = localStorage.getItem('yt_playlist_items_cache');
        if (playlistItemsCache) {
          try {
            const parsedItems = JSON.parse(playlistItemsCache);
            this.playlistCache = new Map();
            
            if (parsedItems && typeof parsedItems === 'object') {
              Object.entries(parsedItems).forEach(([playlistId, cacheData]: [string, any]) => {
                if (cacheData && cacheData.data) {
                  this.playlistCache.set(playlistId, {
                    data: cacheData.data || [],
                    timestamp: cacheData.timestamp || 0
                  });
                }
              });
            }
            console.log(`Cache de ${this.playlistCache.size} playlists carregado`);
          } catch (e) {
            console.error('Erro ao processar cache de itens de playlist:', e);
          }
        }
        
        // Carregar cache por contas
        this.loadAccountSpecificCache();
      }
    } catch (error) {
      console.error('Erro ao carregar cache do YouTube:', error);
      // Em caso de erro, ignorar o cache e começar com um cache limpo
    }
  }
  
  // Carregar cache específico por conta
  private loadAccountSpecificCache(): void {
    try {
      // Inicializar maps
      this.accountChannelsCache = new Map();
      this.accountPlaylistsCache = new Map();
      this.accountPlaylistCache = new Map();
      
      // Carregar cache de canais por conta
      const accountChannelsCache = localStorage.getItem('yt_account_channels_cache');
      if (accountChannelsCache) {
        try {
          const parsed = JSON.parse(accountChannelsCache);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([accountId, cacheData]: [string, any]) => {
              this.accountChannelsCache.set(accountId, {
                data: cacheData.data || [],
                timestamp: cacheData.timestamp || 0
              });
            });
          }
          console.log(`Cache de canais para ${this.accountChannelsCache.size} contas carregado`);
        } catch (e) {
          console.error('Erro ao processar cache de canais por conta:', e);
        }
      }
      
      // Carregar cache de playlists por conta
      const accountPlaylistsCache = localStorage.getItem('yt_account_playlists_cache');
      if (accountPlaylistsCache) {
        try {
          const parsed = JSON.parse(accountPlaylistsCache);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([accountId, cacheData]: [string, any]) => {
              this.accountPlaylistsCache.set(accountId, {
                playlists: cacheData.playlists || [],
                nextPageToken: cacheData.nextPageToken,
                timestamp: cacheData.timestamp || 0
              });
            });
          }
          console.log(`Cache de playlists para ${this.accountPlaylistsCache.size} contas carregado`);
        } catch (e) {
          console.error('Erro ao processar cache de playlists por conta:', e);
        }
      }
      
      // Carregar cache de itens de playlist por conta
      const accountPlaylistItemsCache = localStorage.getItem('yt_account_playlist_items_cache');
      if (accountPlaylistItemsCache) {
        try {
          const parsed = JSON.parse(accountPlaylistItemsCache);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([accountId, playlistsMap]: [string, any]) => {
              const playlistMap = new Map();
              
              if (playlistsMap && typeof playlistsMap === 'object') {
                Object.entries(playlistsMap).forEach(([playlistId, itemsCache]: [string, any]) => {
                  if (itemsCache && itemsCache.data) {
                    playlistMap.set(playlistId, {
                      data: itemsCache.data || [],
                      timestamp: itemsCache.timestamp || 0
                    });
                  }
                });
              }
              
              if (playlistMap.size > 0) {
                this.accountPlaylistCache.set(accountId, playlistMap);
              }
            });
          }
          
          console.log(`Cache de itens de playlist para ${this.accountPlaylistCache.size} contas carregado`);
        } catch (e) {
          console.error('Erro ao processar cache de itens de playlist por conta:', e);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cache específico por conta:', error);
    }
  }

  // Persistir cache no localStorage
  private persistCache(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        console.log('Persistindo cache do YouTube no localStorage');
        
        // Salvar cache de canais
        if (this.channelsCache) {
          try {
            localStorage.setItem('yt_channels_cache', JSON.stringify(this.channelsCache));
          } catch (e) {
            console.error('Erro ao salvar cache de canais:', e);
          }
        }
        
        // Salvar cache de playlists
        if (this.myPlaylistsCache) {
          try {
            localStorage.setItem('yt_playlists_cache', JSON.stringify(this.myPlaylistsCache));
          } catch (e) {
            console.error('Erro ao salvar cache de playlists:', e);
          }
        }
        
        // Salvar cache de itens de playlists (converter Map para objeto)
        if (this.playlistCache.size > 0) {
          try {
            const playlistItemsObj: Record<string, any> = {};
            this.playlistCache.forEach((value, key) => {
              if (key && value) {
                playlistItemsObj[key] = value;
              }
            });
            localStorage.setItem('yt_playlist_items_cache', JSON.stringify(playlistItemsObj));
          } catch (e) {
            console.error('Erro ao salvar cache de itens de playlist:', e);
          }
        }
        
        // Persistir caches específicos de conta
        this.persistAccountSpecificCache();
      }
    } catch (error) {
      console.error('Erro ao persistir cache do YouTube:', error);
      // Em caso de erro, continuar sem persistir o cache
    }
  }
  
  // Persistir caches específicos por conta
  private persistAccountSpecificCache(): void {
    try {
      // Canais por conta
      if (this.accountChannelsCache.size > 0) {
        try {
          const accountChannelsObj: Record<string, any> = {};
          this.accountChannelsCache.forEach((value, key) => {
            if (key && value) {
              accountChannelsObj[key] = value;
            }
          });
          localStorage.setItem('yt_account_channels_cache', JSON.stringify(accountChannelsObj));
        } catch (e) {
          console.error('Erro ao salvar cache de canais por conta:', e);
        }
      }
      
      // Playlists por conta
      if (this.accountPlaylistsCache.size > 0) {
        try {
          const accountPlaylistsObj: Record<string, any> = {};
          this.accountPlaylistsCache.forEach((value, key) => {
            if (key && value) {
              accountPlaylistsObj[key] = value;
            }
          });
          localStorage.setItem('yt_account_playlists_cache', JSON.stringify(accountPlaylistsObj));
        } catch (e) {
          console.error('Erro ao salvar cache de playlists por conta:', e);
        }
      }
      
      // Itens de playlist por conta (converter Map de Maps para objeto)
      if (this.accountPlaylistCache.size > 0) {
        try {
          const accountPlaylistItemsObj: Record<string, Record<string, any>> = {};
          this.accountPlaylistCache.forEach((playlistMap, accountId) => {
            if (!accountId || !playlistMap || playlistMap.size === 0) return;
            
            const playlistObj: Record<string, any> = {};
            playlistMap.forEach((value, playlistId) => {
              if (playlistId && value) {
                playlistObj[playlistId] = value;
              }
            });
            
            if (Object.keys(playlistObj).length > 0) {
              accountPlaylistItemsObj[accountId] = playlistObj;
            }
          });
          
          if (Object.keys(accountPlaylistItemsObj).length > 0) {
            localStorage.setItem('yt_account_playlist_items_cache', JSON.stringify(accountPlaylistItemsObj));
          }
        } catch (e) {
          console.error('Erro ao salvar cache de itens de playlist por conta:', e);
        }
      }
    } catch (error) {
      console.error('Erro ao persistir cache específico por conta:', error);
    }
  }

  // Construtor para carregar cache ao inicializar
  constructor() {
    // Carregar cache do localStorage se disponível
    if (typeof window !== 'undefined') {
      this.loadCache();
      
      // Configurar persistência automática antes de fechar a página
      window.addEventListener('beforeunload', () => {
        this.persistCache();
      });
      
      // Persistir cache periodicamente (a cada 5 minutos)
      setInterval(() => {
        this.persistCache();
      }, 5 * 60 * 1000);
    }
  }

  // Método para buscar vídeos em todas as playlists do usuário
  async searchVideoAcrossPlaylists(
    searchTerm: string,
    accountId?: string,
    providedToken?: string
  ): Promise<PlaylistWithFoundVideos[]> {
    try {
      console.log(`Buscando vídeos com o termo "${searchTerm}" em todas as playlists`);
      
      // Obter todas as playlists do usuário
      const { playlists } = await this.getMyPlaylists(undefined, accountId, providedToken);
      
      if (playlists.length === 0) {
        console.log('Nenhuma playlist encontrada para pesquisar');
        return [];
      }
      
      console.log(`Iniciando busca em ${playlists.length} playlists`);
      
      // Para cada playlist, buscar seus vídeos e filtrar pelo termo de pesquisa
      const results = await Promise.all(
        playlists.map(async (playlist) => {
          try {
            // Obter todos os vídeos da playlist
            const playlistItems = await this.getPlaylistItems(
              playlist.id, 
              undefined, 
              false, 
              accountId,
              providedToken
            );
            
            // Pesquisar por título (insensível a maiúsculas/minúsculas e acentos)
            const normalizedTerm = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            // Filtrar vídeos pelo termo de pesquisa
            const foundVideos = playlistItems.filter(item => {
              const normalizedTitle = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return normalizedTitle.includes(normalizedTerm);
            });
            
            // Retornar resultado para esta playlist
            return {
              playlist,
              foundVideos
            };
          } catch (error) {
            console.error(`Erro ao buscar vídeos da playlist ${playlist.id}:`, error);
            return {
              playlist,
              foundVideos: []
            };
          }
        })
      );
      
      // Filtrar apenas playlists que tiveram resultados
      const filteredResults = results.filter(result => result.foundVideos.length > 0);
      
      console.log(`Encontrados vídeos em ${filteredResults.length} playlists`);
      return filteredResults;
    } catch (error) {
      console.error('Erro ao buscar vídeos em todas as playlists:', error);
      throw error;
    }
  }
  
  // Método para buscar vídeo pelo ID
  async getVideoById(
    videoId: string,
    accountId?: string,
    providedToken?: string
  ): Promise<YoutubeVideo | null> {
    try {
      // Check cache first
      const cachedVideo = this.videoCache.get(videoId);
      if (cachedVideo && Date.now() - cachedVideo.timestamp < this.REFRESH_INTERVAL) {
        return cachedVideo.data;
      }

      // Get video data from YouTube API
      const videoData = await this.fetchFromYoutube('videos', {
        'part': 'snippet,statistics',
        'id': videoId
      }, providedToken);
      if (!videoData || !videoData.items || videoData.items.length === 0) return null;

      // Get all playlists for the account
      const playlists = await this.getMyPlaylists(undefined, accountId);
      const videoPlaylists: YoutubePlaylist[] = [];
      const playlistViews: PlaylistViewStats[] = [];

      // Para cada playlist, verificar se contém o vídeo e coletar estatísticas
      await Promise.all(
        playlists.playlists.map(async (playlist) => {
          try {
            const playlistItems = await this.getPlaylistItems(
              playlist.id,
              undefined,
              false,
              accountId,
              providedToken
            );

            // Se o vídeo estiver nesta playlist
            const videoInPlaylist = playlistItems.find(item => item.videoId === videoId);
            if (videoInPlaylist) {
              videoPlaylists.push(playlist);
              
              // Adicionar estatísticas de visualização da playlist
              playlistViews.push({
                playlistId: playlist.id,
                playlistTitle: playlist.title,
                viewCount: videoInPlaylist.viewCount || 0,
                lastUpdated: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error(`Erro ao verificar playlist ${playlist.id}:`, error);
          }
        })
      );

      // Criar objeto do vídeo
      const video: YoutubeVideo = {
        id: videoData.items[0].id,
        title: videoData.items[0].snippet.title,
        description: videoData.items[0].snippet.description || '',
        thumbnailUrl:
          videoData.items[0].snippet.thumbnails?.high?.url ||
          videoData.items[0].snippet.thumbnails?.medium?.url ||
          videoData.items[0].snippet.thumbnails?.default?.url,
        channelId: videoData.items[0].snippet.channelId,
        channelTitle: videoData.items[0].snippet.channelTitle,
        viewCount: parseInt(videoData.items[0].statistics.viewCount) || 0,
        likeCount: parseInt(videoData.items[0].statistics.likeCount) || 0,
        publishedAt: videoData.items[0].snippet.publishedAt,
        lastUpdated: new Date().toISOString(),
        playlists: videoPlaylists,
        playlistViews: playlistViews
      };

      // Armazenar em cache
      this.videoCache.set(videoId, {
        data: video,
        timestamp: Date.now()
      });

      return video;
    } catch (error) {
      console.error(`Erro ao buscar vídeo ${videoId}:`, error);
      return null;
    }
  }
  
  // Método para buscar vídeo pela URL
  async getVideoByUrl(
    url: string,
    accountId?: string,
    providedToken?: string
  ): Promise<YoutubeVideo | null> {
    try {
      // Extrair ID do vídeo da URL
      const videoId = this.extractVideoId(url);
      
      if (!videoId) {
        console.error('ID do vídeo não encontrado na URL:', url);
        return null;
      }
      
      // Buscar informações do vídeo pelo ID
      return await this.getVideoById(videoId, accountId, providedToken);
    } catch (error) {
      console.error(`Erro ao buscar vídeo pela URL ${url}:`, error);
      return null;
    }
  }

  // Método para buscar estatísticas de visualização para playlists específicas
  async getPlaylistViewStats(playlistIds: string[], accountId?: string): Promise<PlaylistStats[]> {
    try {
      console.log(`Buscando estatísticas para ${playlistIds.length} playlists`);
      const results: PlaylistStats[] = [];
      
      // Processar cada playlist individualmente
      for (const playlistId of playlistIds) {
        try {
          // Obter todos os vídeos da playlist
          const playlistItems = await this.getPlaylistItems(playlistId, undefined, true, accountId);
          
          // Somar as visualizações de todos os vídeos na playlist
          const totalViews = playlistItems.reduce((sum, item) => {
            // Garantir que viewCount seja um número
            const views = item.viewCount !== undefined ? item.viewCount : 0;
            return sum + views;
          }, 0);
          
          results.push({
            playlistId,
            totalViews,
            lastUpdated: new Date().toISOString()
          });
          
          console.log(`Playlist ${playlistId}: ${totalViews} visualizações`);
        } catch (error) {
          console.error(`Erro ao buscar estatísticas da playlist ${playlistId}:`, error);
          // Adicionar entrada com 0 visualizações em caso de erro
          results.push({
            playlistId,
            totalViews: 0,
            lastUpdated: new Date().toISOString()
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Erro geral ao buscar estatísticas das playlists:', error);
      return [];
    }
  }
}

// Criar e exportar uma instância do serviço
export const youtubeService = new YoutubeService(); 