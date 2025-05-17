import { youtubeService, type PlaylistVideoItem } from './youtubeService';

interface VideoSnapshot {
  videoId: string;
  date: string;
  totalViews: number;
  title: string;
  playlists: {
    playlistId: string;
    playlistTitle: string;
  }[];
}

interface PlaylistImpactData {
  playlistId: string;
  playlistTitle: string;
  viewsContribution: number;
  contributionPercentage: number;
  daysInPlaylist: number;
}

class VideoTrackingService {
  private snapshots: Record<string, VideoSnapshot[]> = {};
  private localStorage = window.localStorage;
  private readonly STORAGE_KEY = 'video_tracking_snapshots';
  private scheduledSnapshotJob: number | null = null;

  constructor() {
    this.loadSnapshots();
    this.setupAutomaticSnapshots();
  }

  private loadSnapshots(): void {
    try {
      const data = this.localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.snapshots = JSON.parse(data);
        console.log(`Loaded snapshots for ${Object.keys(this.snapshots).length} videos`);
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
      this.snapshots = {};
    }
  }

  private saveSnapshots(): void {
    try {
      this.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.snapshots));
    } catch (error) {
      console.error('Error saving snapshots:', error);
    }
  }

  // Configurar snapshots automáticos diários às 22h
  private setupAutomaticSnapshots(): void {
    // Limpar qualquer agendamento existente
    if (this.scheduledSnapshotJob !== null) {
      clearTimeout(this.scheduledSnapshotJob);
    }
    
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(22, 0, 0, 0); // 22:00 (10:00 PM)
    
    // Se já passou das 22h hoje, agendar para amanhã às 22h
    if (now.getHours() >= 22) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const timeUntilNextSnapshot = targetTime.getTime() - now.getTime();
    
    // Agendar próxima execução
    this.scheduledSnapshotJob = window.setTimeout(() => {
      this.takeSnapshotsForAllAccounts()
        .then(() => {
          console.log('Automatic snapshots taken successfully');
          // Re-agendar para o próximo dia
          this.setupAutomaticSnapshots();
        })
        .catch(error => {
          console.error('Error taking automatic snapshots:', error);
          // Re-agendar mesmo em caso de erro
          this.setupAutomaticSnapshots();
        });
    }, timeUntilNextSnapshot);
    
    console.log(`Next automatic snapshot scheduled for ${targetTime.toLocaleString()}`);
  }

  async takeSnapshotForVideo(videoId: string, accountId?: string): Promise<VideoSnapshot | null> {
    try {
      // Obter dados do vídeo através da API do YouTube
      const video = await youtubeService.getVideoById(videoId, accountId);
      
      if (!video) {
        console.error(`Video ${videoId} not found`);
        return null;
      }

      // Criar snapshot com data atual
      const today = new Date().toISOString().split('T')[0];
      const snapshot: VideoSnapshot = {
        videoId,
        date: today,
        totalViews: video.viewCount,
        title: video.title,
        playlists: video.playlists?.map(p => ({
          playlistId: p.id,
          playlistTitle: p.title
        })) || []
      };

      // Adicionar à coleção de snapshots
      if (!this.snapshots[videoId]) {
        this.snapshots[videoId] = [];
      }
      
      // Verificar se já existe um snapshot para hoje
      const todaySnapshot = this.snapshots[videoId].find(s => s.date === today);
      if (todaySnapshot) {
        // Atualizar o snapshot existente
        const index = this.snapshots[videoId].indexOf(todaySnapshot);
        this.snapshots[videoId][index] = snapshot;
      } else {
        // Adicionar novo snapshot
        this.snapshots[videoId].push(snapshot);
      }

      // Persistir alterações
      this.saveSnapshots();
      
      return snapshot;
    } catch (error) {
      console.error(`Error taking snapshot for video ${videoId}:`, error);
      return null;
    }
  }

  async takeSnapshotsForAllVideos(accountId?: string): Promise<void> {
    try {
      // Obter todas as playlists
      const { playlists } = await youtubeService.getMyPlaylists(undefined, accountId);
      
      // Para cada playlist, obter vídeos e criar snapshots
      for (const playlist of playlists) {
        const videos = await youtubeService.getPlaylistItems(playlist.id, undefined, false, accountId);
        
        // Criar snapshots para cada vídeo
        for (const video of videos) {
          await this.takeSnapshotForVideo(video.videoId, accountId);
          // Pequena pausa para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`Snapshots taken for all videos in account ${accountId || 'default'}`);
    } catch (error) {
      console.error(`Error taking snapshots for account ${accountId || 'default'}:`, error);
    }
  }

  // Toma snapshots para todas as contas cadastradas
  async takeSnapshotsForAllAccounts(): Promise<void> {
    try {
      // Obter todas as contas do localStorage
      const accountsData = localStorage.getItem('youtube_analyzer_accounts');
      if (!accountsData) {
        // Se não houver contas, usar a conta padrão
        await this.takeSnapshotsForAllVideos();
        return;
      }
      
      const accounts = JSON.parse(accountsData);
      console.log(`Taking snapshots for ${accounts.length} accounts`);
      
      // Para cada conta, criar snapshots
      for (const account of accounts) {
        try {
          await this.takeSnapshotsForAllVideos(account.id);
          // Pequena pausa entre contas
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (accountError) {
          console.error(`Error taking snapshots for account ${account.id}:`, accountError);
          // Continue com a próxima conta mesmo em caso de erro
          continue;
        }
      }
      
      console.log('Snapshots taken for all accounts');
    } catch (error) {
      console.error('Error taking snapshots for all accounts:', error);
      throw error;
    }
  }

  // Obter todos os snapshots de um vídeo
  getVideoSnapshots(videoId: string): VideoSnapshot[] {
    if (!this.snapshots[videoId]) {
      return [];
    }
    
    return [...this.snapshots[videoId]].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
  
  // Obter snapshots de um vídeo em um período específico
  getVideoSnapshotsInPeriod(
    videoId: string, 
    startDate: Date, 
    endDate: Date
  ): VideoSnapshot[] {
    const allSnapshots = this.getVideoSnapshots(videoId);
    
    // Filtrar por período
    return allSnapshots.filter(snapshot => {
      const snapshotDate = new Date(snapshot.date);
      return snapshotDate >= startDate && snapshotDate <= endDate;
    });
  }

  calculatePlaylistImpact(videoId: string): PlaylistImpactData[] {
    const snapshots = this.getVideoSnapshots(videoId);
    if (snapshots.length < 2) {
      console.log(`Not enough snapshots for video ${videoId} to calculate impact`);
      return [];
    }

    // Ordenar snapshots por data (mais antigo primeiro)
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Identificar todas as playlists em que o vídeo já esteve
    const allPlaylists = new Set<string>();
    sortedSnapshots.forEach(snapshot => {
      snapshot.playlists.forEach(playlist => {
        allPlaylists.add(playlist.playlistId);
      });
    });

    const impactData: Record<string, PlaylistImpactData> = {};
    
    // Inicializar dados para cada playlist
    allPlaylists.forEach(playlistId => {
      // Encontrar o título da playlist (do snapshot mais recente que a contém)
      let playlistTitle = '';
      for (let i = sortedSnapshots.length - 1; i >= 0; i--) {
        const playlist = sortedSnapshots[i].playlists.find(p => p.playlistId === playlistId);
        if (playlist) {
          playlistTitle = playlist.playlistTitle;
          break;
        }
      }

      impactData[playlistId] = {
        playlistId,
        playlistTitle,
        viewsContribution: 0,
        contributionPercentage: 0,
        daysInPlaylist: 0
      };
    });

    // Calcular aumento de visualizações entre snapshots consecutivos
    for (let i = 1; i < sortedSnapshots.length; i++) {
      const prevSnapshot = sortedSnapshots[i - 1];
      const currSnapshot = sortedSnapshots[i];
      
      // Visualizações ganhas entre estes dois snapshots
      const viewsGained = Math.max(0, currSnapshot.totalViews - prevSnapshot.totalViews);
      
      // Se não houve aumento, pular
      if (viewsGained === 0) continue;
      
      // Playlists ativas no snapshot atual
      const activePlaylists = currSnapshot.playlists;
      
      if (activePlaylists.length > 0) {
        // Distribuir o ganho de visualizações igualmente entre as playlists ativas
        const viewsPerPlaylist = viewsGained / activePlaylists.length;
        
        // Atualizar dados de impacto para cada playlist ativa
        activePlaylists.forEach(playlist => {
          const impact = impactData[playlist.playlistId];
          impact.viewsContribution += viewsPerPlaylist;
          impact.daysInPlaylist += 1;
        });
      }
    }

    // Calcular percentuais de contribuição
    const totalViews = sortedSnapshots[sortedSnapshots.length - 1].totalViews;
    Object.values(impactData).forEach(impact => {
      impact.contributionPercentage = (impact.viewsContribution / totalViews) * 100;
    });

    // Converter para array e ordenar por contribuição
    return Object.values(impactData)
      .sort((a, b) => b.viewsContribution - a.viewsContribution);
  }

  // Adicionar função para exportar dados de impacto
  public async exportImpactData(videoId: string, format: 'csv' | 'json' = 'json'): Promise<void> {
    try {
      // Verificar se temos snapshots suficientes
      const snapshots = this.getVideoSnapshots(videoId);
      if (snapshots.length < 2) {
        console.error('Snapshots insuficientes para exportar impacto');
        throw new Error('São necessários pelo menos 2 snapshots para exportar dados de impacto.');
      }

      // Calcular dados de impacto
      const impactData = this.calculatePlaylistImpact(videoId);
      
      // Obter informações do último snapshot
      const latestSnapshot = [...snapshots].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      // Obter estimativas de visualizações por playlist
      const playlistViewsEstimates = await this.estimatePlaylistViews(videoId);
      
      // Criar objeto de dados para exportação
      const exportData = {
        videoId,
        title: latestSnapshot.title || videoId,
        totalViews: latestSnapshot.totalViews,
        snapshotPeriod: {
          startDate: snapshots[0].date,
          endDate: latestSnapshot.date,
          totalDays: snapshots.length
        },
        impactData,
        playlistViewsEstimates
      };

      if (format === 'json') {
        // Exportar como JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${videoId}-impact-data.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Exportar como CSV
        let csvContent = 'Dados de Impacto de Playlists\n';
        csvContent += `ID do Vídeo,${videoId}\n`;
        csvContent += `Título do Vídeo,${this.escapeCsvValue(latestSnapshot.title || videoId)}\n`;
        csvContent += `Total de Visualizações,${latestSnapshot.totalViews}\n`;
        csvContent += `Período de Análise,${snapshots[0].date} a ${latestSnapshot.date}\n`;
        csvContent += `Total de Snapshots,${snapshots.length}\n\n`;

        // Adicionar tabela de dados de impacto
        csvContent += 'Playlist,Visualizações Contribuídas,Percentual de Contribuição,Dias na Playlist\n';
        impactData.forEach(impact => {
          csvContent += `${this.escapeCsvValue(impact.playlistTitle)},${Math.round(impact.viewsContribution)},${impact.contributionPercentage.toFixed(2)}%,${impact.daysInPlaylist}\n`;
        });

        // Adicionar estimativas de visualizações por playlist
        csvContent += '\nEstimativas de Visualizações por Playlist\n';
        csvContent += 'Playlist,Posição na Playlist,Visualizações Estimadas,Percentual do Total,Número de Vídeos\n';
        playlistViewsEstimates.forEach(playlist => {
          csvContent += `${this.escapeCsvValue(playlist.playlistTitle)},${playlist.position},${playlist.estimatedViews},${playlist.percentage}%,${playlist.itemCount}\n`;
        });

        // Adicionar histórico de snapshots
        csvContent += '\nHistórico de Snapshots\n';
        csvContent += 'Data,Total de Visualizações,Playlists\n';
        
        // Ordenar snapshots por data (mais antigo primeiro)
        const sortedSnapshots = [...snapshots].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        sortedSnapshots.forEach(snapshot => {
          const playlistsList = snapshot.playlists.map(p => p.playlistTitle).join('; ');
          csvContent += `${snapshot.date},${snapshot.totalViews},${this.escapeCsvValue(playlistsList)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${videoId}-impact-data.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erro ao exportar dados de impacto:', error);
      throw error;
    }
  }

  // Helper para escapar valores CSV
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // Escapar aspas duplicando-as e envolver em aspas se contiver vírgula ou aspas
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Estima as visualizações recebidas por cada playlist para um vídeo
  async estimatePlaylistViews(videoId: string, accountId?: string): Promise<any[]> {
    try {
      // Obter o vídeo com suas playlists
      const video = await youtubeService.getVideoById(videoId, accountId);
      if (!video || !video.playlists || video.playlists.length === 0) return [];
      
      // Obter snapshots para análise de tendência
      const snapshots = this.getVideoSnapshots(videoId);
      const hasSnapshots = snapshots.length > 1;
      
      // Verificar se podemos usar dados analíticos reais do localStorage (se disponíveis)
      const analyticsDataKey = `youtube_analytics_data_${videoId}`;
      let analyticsData = null;
      try {
        const storedData = localStorage.getItem(analyticsDataKey);
        if (storedData) {
          analyticsData = JSON.parse(storedData);
        } else {
          // Se não tiver dados salvos, criar dados iniciais vazios
          analyticsData = {
            lastUpdated: new Date().toISOString(),
            playlists: {}
          };
          
          // Não inicializar com nenhum valor fixo - começa com 0 visualizações
          // Serão incrementadas apenas quando o usuário realmente registrar visualizações
          
          // Salvar os dados iniciais
          localStorage.setItem(analyticsDataKey, JSON.stringify(analyticsData));
        }
      } catch (e) {
        console.error("Erro ao ler dados analíticos do localStorage:", e);
      }
      
      // Obter estatísticas detalhadas de cada playlist
      const playlistStats = await Promise.all(
        video.playlists.map(async (playlist) => {
          try {
            // Buscar todas as informações detalhadas da playlist
            const playlistDetails = await youtubeService.getPlaylistItems(playlist.id, undefined, true, accountId);
            
            // Verificar se temos dados do Analytics para esta playlist
            let viewCount = 0; // Valor padrão é zero - sem visualizações iniciais
            
            // Se temos dados analíticos armazenados, use-os
            if (analyticsData && analyticsData.playlists && analyticsData.playlists[playlist.id]) {
              viewCount = analyticsData.playlists[playlist.id].viewCount;
            }
            
            // Calcular posição do vídeo na playlist
            const videoItem = playlistDetails.find(item => item.videoId === videoId);
            const videoPosition = videoItem ? videoItem.position : 
              playlistDetails.findIndex(item => item.videoId === videoId);
            
            // Calcular a porcentagem para a barra de progresso
            const percentage = video.viewCount > 0 ? (viewCount / video.viewCount) * 100 : 0.0;
            
            return {
              playlistId: playlist.id,
              playlistTitle: playlist.title,
              thumbnailUrl: playlist.thumbnailUrl,
              itemCount: playlist.itemCount || playlistDetails.length,
              estimatedViews: viewCount, // Valor real, não estimado
              percentage: percentage, // Não arredondar, será formatado na interface
              position: videoPosition >= 0 ? videoPosition + 1 : 'Desconhecida'
            };
          } catch (error) {
            console.error(`Erro ao processar playlist ${playlist.id}:`, error);
            return {
              playlistId: playlist.id,
              playlistTitle: playlist.title,
              thumbnailUrl: playlist.thumbnailUrl,
              itemCount: playlist.itemCount || 0,
              estimatedViews: 0, // Iniciar com 0 - sem valor fixo
              percentage: 0.0,
              position: 'Erro',
              error: 'Falha ao processar esta playlist'
            };
          }
        })
      );
      
      // Ordenar por maior contribuição primeiro
      return playlistStats.sort((a, b) => b.estimatedViews - a.estimatedViews);
    } catch (error) {
      console.error('Erro ao estimar visualizações por playlist:', error);
      return [];
    }
  }
  
  // Método para registrar uma visualização vinda de playlist
  registerPlaylistView(videoId: string, playlistId: string): void {
    try {
      const analyticsDataKey = `youtube_analytics_data_${videoId}`;
      let analyticsData = null;
      try {
        const storedData = localStorage.getItem(analyticsDataKey);
        if (storedData) {
          analyticsData = JSON.parse(storedData);
        }
      } catch (e) {
        console.error("Erro ao ler dados analíticos do localStorage:", e);
      }
      
      // Inicializar dados se não existirem
      if (!analyticsData) {
        analyticsData = {
          lastUpdated: new Date().toISOString(),
          playlists: {}
        };
      }
      
      // Inicializar dados da playlist se não existirem
      if (!analyticsData.playlists[playlistId]) {
        analyticsData.playlists[playlistId] = {
          viewCount: 0 // Iniciar com 0 - sem valor fixo
        };
      }
      
      // Incrementar contagem de visualizações
      analyticsData.playlists[playlistId].viewCount++;
      
      // Atualizar timestamp
      analyticsData.lastUpdated = new Date().toISOString();
      
      // Salvar no localStorage
      localStorage.setItem(analyticsDataKey, JSON.stringify(analyticsData));
    } catch (e) {
      console.error("Erro ao registrar visualização de playlist:", e);
    }
  }

  // Força a atualização dos dados no localStorage para garantir que as alterações sejam exibidas
  forceUpdateData(videoId: string): void {
    try {
      // Este método é uma garantia adicional para garantir que dados sejam atualizados
      const analyticsDataKey = `youtube_analytics_data_${videoId}`;
      const storedData = localStorage.getItem(analyticsDataKey);
      
      if (storedData) {
        // Se existirem dados armazenados, recarrega-os para garantir atualização
        const analyticsData = JSON.parse(storedData);
        // Salvar os dados novamente para garantir que sejam atualizados
        localStorage.setItem(analyticsDataKey, JSON.stringify(analyticsData));
      }
    } catch (e) {
      console.error("Erro ao atualizar dados do localStorage:", e);
    }
  }
}

export const videoTrackingService = new VideoTrackingService(); 