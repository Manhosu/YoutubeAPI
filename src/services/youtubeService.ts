private async addVideoStatistics(
  items: PlaylistVideoItem[], 
  accountId?: string,
  providedToken?: string
): Promise<void> {
  try {
    if (items.length === 0) {
      console.log('No items to add statistics to');
      return;
    }

    // Log the initial state for debugging
    console.log(`Adding statistics to ${items.length} videos`);

    // Processar em lotes do tamanho máximo permitido
    for (let i = 0; i < items.length; i += this.MAX_BATCH_SIZE) {
      const batch = items.slice(i, i + this.MAX_BATCH_SIZE);
      const videoIds = batch.map(item => item.videoId).filter(Boolean).join(',');
      
      if (!videoIds) {
        console.warn('No valid video IDs in this batch');
        continue;
      }

      // Parâmetros para a requisição
      const params: Record<string, string> = {
        'part': 'statistics,snippet',
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
      
      try {
        // Fazer a requisição com o token apropriado
        const data = await this.fetchFromYoutube('videos', params, token);
        
        if (!data.items || data.items.length === 0) {
          console.warn(`No video statistics returned for batch ${i}/${items.length}`);
          continue;
        }
        
        console.log(`Received statistics for ${data.items.length} videos out of ${batch.length} requested`);
        
        // Associar estatísticas aos itens correspondentes
        data.items.forEach((videoData: any) => {
          const videoId = videoData.id;
          const stats = videoData.statistics || {};
          
          // Encontrar todos os itens com este ID de vídeo
          const matchingItems = batch.filter(item => item.videoId === videoId);
          
          if (matchingItems.length === 0) {
            console.warn(`No matching items found for video ID ${videoId}`);
            return;
          }
          
          matchingItems.forEach(item => {
            // Parse numbers with explicit fallbacks to 0
            item.viewCount = stats.viewCount ? parseInt(stats.viewCount) : 0;
            item.likeCount = stats.likeCount ? parseInt(stats.likeCount) : 0;
            item.dislikeCount = stats.dislikeCount ? parseInt(stats.dislikeCount) : 0;
            item.lastUpdated = new Date().toISOString();
            
            // Log for debugging (only ones with views)
            if (item.viewCount > 0) {
              console.log(`Video ${item.videoId} (${item.title}): ${item.viewCount} views`);
            }
          });
        });
        
        // Handle videos that didn't get statistics
        const processedIds = data.items.map((item: any) => item.id);
        const missingItems = batch.filter(item => !processedIds.includes(item.videoId));
        
        if (missingItems.length > 0) {
          console.warn(`${missingItems.length} videos didn't receive statistics`);
          
          // Set default values for missing items
          missingItems.forEach(item => {
            item.viewCount = 0;
            item.likeCount = 0;
            item.dislikeCount = 0;
            item.lastUpdated = new Date().toISOString();
          });
        }
      } catch (batchError) {
        console.error(`Error fetching statistics for batch ${i}/${items.length}:`, batchError);
        
        // Set default values for all items in the failed batch
        batch.forEach(item => {
          item.viewCount = item.viewCount || 0; // Preserve existing values if they exist
          item.likeCount = item.likeCount || 0;
          item.dislikeCount = item.dislikeCount || 0;
          item.lastUpdated = new Date().toISOString();
        });
      }
    }
    
    // Log summary after processing
    const totalViewCount = items.reduce((sum, item) => sum + (item.viewCount || 0), 0);
    console.log(`Total view count across all videos: ${totalViewCount}`);
  } catch (error) {
    console.error('Erro geral ao adicionar estatísticas aos vídeos:', error);
    // Ensure all items have at least 0 for view counts to prevent NaN in calculations
    items.forEach(item => {
      item.viewCount = item.viewCount || 0;
      item.likeCount = item.likeCount || 0;
      item.dislikeCount = item.dislikeCount || 0;
    });
  }
}

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
  
  console.log(`Gerando relatório consolidado para ${accountIds.length} contas...`);
  
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
        // Log for debugging
        console.log(`Processando playlist: "${playlist.title}" (${playlist.id})`);
        
        // Incrementar contador de vídeos
        totalVideos += playlist.itemCount;
        
        // Tentar obter visualizações da playlist
        try {
          console.log(`Buscando itens da playlist ${playlist.id}...`);
          
          // Forçar atualização para obter os dados mais recentes
          const playlistItems = await this.getPlaylistItems(playlist.id, undefined, true, accountId);
          
          console.log(`Recebidos ${playlistItems.length} itens para a playlist "${playlist.title}"`);
          
          // Verificar se algum item tem contagem de visualizações indefinida
          const itemsWithMissingViews = playlistItems.filter(item => item.viewCount === undefined);
          if (itemsWithMissingViews.length > 0) {
            console.warn(`${itemsWithMissingViews.length} vídeos da playlist "${playlist.title}" não têm contagem de visualizações`);
          }
          
          // Somar visualizações
          const playlistViews = playlistItems.reduce((sum, item) => {
            // Garantir que viewCount seja um número
            const views = item.viewCount !== undefined ? item.viewCount : 0;
            
            if (views > 0) {
              console.log(`Vídeo "${item.title}" (${item.videoId}): ${views} visualizações`);
            }
            
            return sum + views;
          }, 0);
          
          console.log(`Playlist "${playlist.title}" (${playlist.id}) tem ${playlistViews} visualizações totais`);
          totalViews += playlistViews;
          
          // Adicionar dado de visualizações à playlist
          playlist.totalViews = playlistViews;
        } catch (error) {
          console.error(`Erro ao obter estatísticas da playlist "${playlist.title}" (${playlist.id}):`, error);
          
          // Manter totalViews como 0 em vez de undefined
          playlist.totalViews = 0;
        }
      }
      
      playlists.push(...accountPlaylists);
    } catch (error) {
      console.error(`Erro ao obter dados da conta ${accountId}:`, error);
    }
  }
  
  // Verificar playlists sem visualizações para debugging
  const playlistsWithZeroViews = playlists.filter(p => !p.totalViews || p.totalViews === 0);
  if (playlistsWithZeroViews.length > 0) {
    console.warn(`${playlistsWithZeroViews.length} playlists têm 0 visualizações:`);
    playlistsWithZeroViews.forEach(p => {
      console.warn(`- "${p.title}" (${p.id}): ${p.totalViews} visualizações, ${p.itemCount} vídeos`);
    });
  }
  
  console.log(`Relatório consolidado: ${totalVideos} vídeos, ${totalViews} visualizações totais`);
  
  return {
    channels,
    playlists,
    totalVideos,
    totalViews
  };
}

async getPlaylistItems(
  playlistId: string, 
  pageToken?: string, 
  forceRefresh = false,
  accountId?: string,
  providedToken?: string
): Promise<PlaylistVideoItem[]> {
  try {
    console.log(`Buscando itens da playlist ${playlistId}, conta: ${accountId || 'padrão'}`);
    
    // Verificar cache primeiro
    const cacheKey = playlistId;
    const cachedResult = playlistItemsCache.get(cacheKey);
    
    if (!forceRefresh && cachedResult && (Date.now() - cachedResult.timestamp < this.CACHE_TTL)) {
      console.log(`Usando dados em cache para itens da playlist ${playlistId}`);
      return cachedResult.data;
    }
    
    // Buscar os itens da playlist
    const allItems: PlaylistVideoItem[] = [];
    
    // Parâmetros para a API
    const params: Record<string, any> = {
      'part': 'snippet,contentDetails',
      'maxResults': 50,
      'playlistId': playlistId
    };
    
    if (pageToken) {
      params.pageToken = pageToken;
    }
    
    // Tenta usar o token fornecido
    let token = providedToken;
    
    // Se não houver token e houver ID de conta, tentar buscar o token da conta
    if (!token && accountId) {
      try {
        console.log(`Buscando token para a conta ${accountId}...`);
        // Tentar buscar o token do mapeamento
        const accounts = JSON.parse(localStorage.getItem('youtube_analyzer_accounts') || '[]');
        const account = accounts.find((acc: any) => acc.id === accountId);
        
        if (account && account.providerToken) {
          console.log(`Token encontrado para a conta ${accountId}`);
          token = account.providerToken;
        } else {
          console.warn(`Nenhum token encontrado para a conta ${accountId}`);
        }
      } catch (tokenError) {
        console.error(`Erro ao buscar token para conta ${accountId}:`, tokenError);
      }
    }
    
    if (!token) {
      console.warn(`Não foi possível encontrar um token válido para a playlist ${playlistId}. Tentando com token padrão.`);
    }
    
    // Fazer a requisição com o token apropriado
    try {
      console.log(`Fazendo requisição à API do YouTube para playlist ${playlistId}`);
      const data = await this.fetchFromYoutube('playlistItems', params, token);
      
      if (!data.items || data.items.length === 0) {
        console.warn(`Nenhum item retornado para a playlist ${playlistId}`);
        return [];
      }
      
      console.log(`Recebidos ${data.items.length} itens da playlist ${playlistId}`);
      
      // Processar os itens recebidos
      const items = data.items.map((item: any, index: number) => ({
        playlistId,
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        thumbnailUrl: 
          item.snippet.thumbnails?.high?.url || 
          item.snippet.thumbnails?.medium?.url || 
          item.snippet.thumbnails?.default?.url,
        position: item.snippet.position,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      }));
      
      // Adicionar os novos itens à lista
      allItems.push(...items);
      
      // Se houver mais páginas, buscar recursivamente
      if (data.nextPageToken) {
        const nextPageItems = await this.getPlaylistItems(
          playlistId, 
          data.nextPageToken, 
          false, 
          accountId,
          token
        );
        allItems.push(...nextPageItems);
      }
      
      // Agora buscar estatísticas dos vídeos em lote
      console.log(`Buscando estatísticas para ${allItems.length} vídeos da playlist ${playlistId}`);
      await this.addVideoStatistics(allItems, accountId, token);
      
      // Armazenar no cache
      playlistItemsCache.set(cacheKey, {
        data: allItems,
        timestamp: Date.now()
      });
      
      // Persistir cache
      this.persistCache();
      
      return allItems;
    } catch (apiError) {
      console.error(`Erro na requisição à API do YouTube para playlist ${playlistId}:`, apiError);
      throw apiError;
    }
  } catch (error) {
    console.error(`Erro ao obter itens da playlist ${playlistId}:`, error);
    return [];
  }
} 