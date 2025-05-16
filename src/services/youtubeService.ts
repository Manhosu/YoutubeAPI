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

// Interface para dados do Analytics
interface PlaylistAnalytics {
  views: number;
  likes: number;
  averageViewDuration: string;
  averageViewPercentage: number;
  startDate: string;
  endDate: string;
  dailyStats: {
    date: string;
    views: number;
    likes: number;
    averageViewDuration: string;
    averageViewPercentage: number;
  }[];
  videoStats: {
    videoId: string;
    title: string;
    views: number;
    likes: number;
    averageViewDuration: string;
    averageViewPercentage: number;
  }[];
}

// Método para buscar dados do YouTube Analytics
async getPlaylistAnalytics(
  playlistId: string,
  startDate: string,
  endDate: string,
  accountId?: string
): Promise<PlaylistAnalytics | null> {
  try {
    // Obter token de acesso
    let token;
    if (accountId) {
      const accounts = JSON.parse(localStorage.getItem('youtube_analyzer_accounts') || '[]');
      const account = accounts.find((acc: any) => acc.id === accountId);
      if (account && account.providerToken) {
        token = account.providerToken;
      }
    }

    if (!token) {
      console.error('Token não encontrado para análise da playlist');
      return null;
    }

    // Primeiro, precisamos obter os IDs dos vídeos da playlist
    const playlistItems = await this.getPlaylistItems(playlistId, undefined, true, accountId);
    const videoIds = playlistItems.map(item => item.videoId).join(',');

    if (!videoIds) {
      console.error('Nenhum vídeo encontrado na playlist');
      return null;
    }

    // Parâmetros para a requisição do Analytics
    const analyticsParams = {
      'ids': 'channel==MINE',
      'metrics': 'views,likes,averageViewDuration,averageViewPercentage',
      'dimensions': 'video,day',
      'filters': `video==${videoIds}`,
      'startDate': startDate,
      'endDate': endDate,
      'sort': 'day'
    };

    // Fazer requisição para a API do Analytics
    const analyticsData = await this.fetchFromYoutube(
      'youtubeAnalytics/v2/reports',
      analyticsParams,
      token
    );

    if (!analyticsData || !analyticsData.rows) {
      console.error('Dados do Analytics não disponíveis');
      return null;
    }

    // Processar dados diários
    const dailyStats: any[] = [];
    const videoStatsMap = new Map();

    analyticsData.rows.forEach((row: any) => {
      const [videoId, date, views, likes, duration, percentage] = row;
      
      // Atualizar estatísticas do vídeo
      if (!videoStatsMap.has(videoId)) {
        const video = playlistItems.find(item => item.videoId === videoId);
        videoStatsMap.set(videoId, {
          videoId,
          title: video?.title || 'Vídeo não encontrado',
          views: 0,
          likes: 0,
          averageViewDuration: 0,
          averageViewPercentage: 0,
          daysWithData: 0
        });
      }

      const videoStats = videoStatsMap.get(videoId);
      videoStats.views += parseInt(views) || 0;
      videoStats.likes += parseInt(likes) || 0;
      videoStats.averageViewDuration += parseFloat(duration) || 0;
      videoStats.averageViewPercentage += parseFloat(percentage) || 0;
      videoStats.daysWithData++;

      // Atualizar estatísticas diárias
      const existingDayStats = dailyStats.find(d => d.date === date);
      if (existingDayStats) {
        existingDayStats.views += parseInt(views) || 0;
        existingDayStats.likes += parseInt(likes) || 0;
        existingDayStats.averageViewDuration += parseFloat(duration) || 0;
        existingDayStats.averageViewPercentage += parseFloat(percentage) || 0;
        existingDayStats.videosCount++;
      } else {
        dailyStats.push({
          date,
          views: parseInt(views) || 0,
          likes: parseInt(likes) || 0,
          averageViewDuration: parseFloat(duration) || 0,
          averageViewPercentage: parseFloat(percentage) || 0,
          videosCount: 1
        });
      }
    });

    // Calcular médias para estatísticas diárias
    const processedDailyStats = dailyStats.map(day => ({
      date: day.date,
      views: day.views,
      likes: day.likes,
      averageViewDuration: this.formatDuration(day.averageViewDuration / day.videosCount),
      averageViewPercentage: parseFloat((day.averageViewPercentage / day.videosCount).toFixed(2))
    }));

    // Calcular médias para estatísticas dos vídeos
    const processedVideoStats = Array.from(videoStatsMap.values()).map(video => ({
      videoId: video.videoId,
      title: video.title,
      views: video.views,
      likes: video.likes,
      averageViewDuration: this.formatDuration(video.averageViewDuration / video.daysWithData),
      averageViewPercentage: parseFloat((video.averageViewPercentage / video.daysWithData).toFixed(2))
    }));

    // Calcular totais e médias gerais
    const totalViews = processedVideoStats.reduce((sum, video) => sum + video.views, 0);
    const totalLikes = processedVideoStats.reduce((sum, video) => sum + video.likes, 0);
    const averageViewDuration = this.formatDuration(
      processedVideoStats.reduce((sum, video) => {
        const [minutes, seconds] = video.averageViewDuration.split(':').map(Number);
        return sum + (minutes * 60 + seconds);
      }, 0) / processedVideoStats.length
    );
    const averageViewPercentage = parseFloat(
      (processedVideoStats.reduce((sum, video) => sum + video.averageViewPercentage, 0) / 
      processedVideoStats.length).toFixed(2)
    );

    return {
      views: totalViews,
      likes: totalLikes,
      averageViewDuration,
      averageViewPercentage,
      startDate,
      endDate,
      dailyStats: processedDailyStats,
      videoStats: processedVideoStats.sort((a, b) => b.views - a.views)
    };
  } catch (error) {
    console.error('Erro ao buscar dados do Analytics:', error);
    return null;
  }
}

// Método auxiliar para formatar duração
private formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
    playlists: await Promise.all(data.playlists.map(async playlist => {
      // Buscar dados do Analytics para cada playlist
      let analyticsData = null;
      if (dateRange) {
        analyticsData = await this.getPlaylistAnalytics(
          playlist.id,
          dateRange.startDate,
          dateRange.endDate,
          accountIds[0] // Usando a primeira conta como referência
        );
      }

      return {
        id: playlist.id,
        title: playlist.title,
        channelId: playlist.channelId,
        channelTitle: playlist.channelTitle,
        itemCount: playlist.itemCount,
        totalViews: analyticsData?.views || playlist.totalViews || 0,
        analytics: analyticsData ? {
          likes: analyticsData.likes,
          averageViewDuration: analyticsData.averageViewDuration,
          averageViewPercentage: analyticsData.averageViewPercentage
        } : null
      };
    }))
  };
  
  // Se não for relatório de crescimento, retorna o padrão
  if (!isGrowthReport || !dateRange) {
    return baseReport;
  }
  
  // Para relatório de crescimento, adiciona métricas adicionais
  try {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    // Calcular duração do período em dias
    const periodDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Gerar dados de crescimento por canal usando Analytics
    const channelGrowthData = await Promise.all(data.channels.map(async channel => {
      // Buscar dados do Analytics para todos os vídeos do canal
      const channelVideos = data.playlists
        .filter(p => p.channelId === channel.id)
        .flatMap(p => p.items || []);
      
      const videoIds = channelVideos.map(v => v.videoId).join(',');
      
      if (!videoIds) {
        return {
          id: channel.id,
          title: channel.title,
          views: 0,
          likes: 0,
          growthPercentage: 0,
          customUrl: channel.customUrl || ''
        };
      }

      // Buscar dados do Analytics
      const analyticsParams = {
        'ids': 'channel==MINE',
        'metrics': 'views,likes',
        'dimensions': 'video',
        'filters': `video==${videoIds}`,
        'startDate': dateRange.startDate,
        'endDate': dateRange.endDate
      };

      const analyticsData = await this.fetchFromYoutube(
        'youtubeAnalytics/v2/reports',
        analyticsParams,
        accountIds[0] // Usando a primeira conta como referência
      );

      if (!analyticsData || !analyticsData.rows) {
        return {
          id: channel.id,
          title: channel.title,
          views: 0,
          likes: 0,
          growthPercentage: 0,
          customUrl: channel.customUrl || ''
        };
      }

      // Somar dados de todos os vídeos
      const totalStats = analyticsData.rows.reduce((acc: any, row: any) => ({
        views: acc.views + (parseInt(row[1]) || 0),
        likes: acc.likes + (parseInt(row[2]) || 0)
      }), { views: 0, likes: 0 });

      return {
        id: channel.id,
        title: channel.title,
        views: totalStats.views,
        likes: totalStats.likes,
        growthPercentage: 0, // Será calculado depois
        customUrl: channel.customUrl || ''
      };
    }));
    
    // Ordenar canais por visualizações
    const sortedChannels = [...channelGrowthData].sort((a, b) => b.views - a.views);
    
    // Calcular crescimento e tendências para o período
    const customGrowthData = {
      views: channelGrowthData.reduce((sum, channel) => sum + channel.views, 0),
      likes: channelGrowthData.reduce((sum, channel) => sum + channel.likes, 0),
      percentageViews: 0,
      percentageLikes: 0
    };
    
    // Gerar dados de vídeos em alta usando Analytics
    const topVideos = await Promise.all(
      data.playlists.flatMap(p => p.items || [])
        .slice(0, 10) // Limitar a 10 vídeos para performance
        .map(async video => {
          const analyticsData = await this.fetchFromYoutube(
            'youtubeAnalytics/v2/reports',
            {
              'ids': 'channel==MINE',
              'metrics': 'views,likes',
              'dimensions': 'video',
              'filters': `video==${video.videoId}`,
              'startDate': dateRange.startDate,
              'endDate': dateRange.endDate
            },
            accountIds[0]
          );

          if (!analyticsData || !analyticsData.rows || !analyticsData.rows[0]) {
            return null;
          }

          const row = analyticsData.rows[0];
          return {
            id: video.videoId,
            title: video.title,
            views: parseInt(row[1]) || 0,
            likes: parseInt(row[2]) || 0
          };
        })
    );

    // Filtrar vídeos sem dados e ordenar por visualizações
    const validTopVideos = topVideos
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    
    // Gerar dados de tendências mensais usando Analytics
    const generateMonthlyTrends = async () => {
      const months = [];
      const currentDate = new Date(endDate);
      const monthCount = Math.min(Math.max(Math.ceil(periodDuration / 30), 3), 6);
      
      for (let i = 0; i < monthCount; i++) {
        const monthEndDate = format(currentDate, 'yyyy-MM-dd');
        currentDate.setDate(currentDate.getDate() - 30);
        const monthStartDate = format(currentDate, 'yyyy-MM-dd');
        
        // Buscar dados do Analytics para o mês
        const monthlyData = await this.fetchFromYoutube(
          'youtubeAnalytics/v2/reports',
          {
            'ids': 'channel==MINE',
            'metrics': 'views,estimatedMinutesWatched,likes,subscribersGained',
            'startDate': monthStartDate,
            'endDate': monthEndDate
          },
          accountIds[0]
        );

        if (monthlyData && monthlyData.rows && monthlyData.rows[0]) {
          const [views, watchTime, likes, subscribers] = monthlyData.rows[0];
          months.push({
            month: format(currentDate, 'MMM/yy', { locale: ptBR }),
            views: parseInt(views) || 0,
            watchTimeMinutes: parseInt(watchTime) || 0,
            likes: parseInt(likes) || 0,
            subscribers: parseInt(subscribers) || 0
          });
        }
      }
      
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
        custom: customGrowthData
      },
      topPerformers: {
        channels: sortedChannels,
        videos: validTopVideos
      },
      trends: {
        monthly: await generateMonthlyTrends()
      }
    };
    
    return growthReport;
  } catch (error) {
    console.error('Erro ao calcular dados de crescimento:', error);
    return baseReport;
  }
} 