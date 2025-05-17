// Definindo a interface localmente para evitar problemas de importação
interface PlaylistVideoItem {
  playlistId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  position: number;
  viewCount?: number;
  likeCount?: number;
  dislikeCount?: number;
  estimatedViews?: number;
  channelTitle?: string;
  publishedAt?: string;
  lastUpdated?: string;
}

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para representar um snapshot
interface Snapshot {
  id?: string;
  date: string;
  totalViews: number;
  playlistId?: string;
  videoId?: string;
  playlists?: number;
  likes?: number;
  [key: string]: any;
}

interface DailyStats {
  data: string;
  maxVisualizacoes: number;
  maxLikes: number;
  videoComMaxVisualizacoes: string;
  videoComMaxLikes: string;
}

interface VideoGrowth {
  videoId: string;
  titulo: string;
  visualizacoesIniciais: number;
  visualizacoesFinais: number;
  crescimentoVisualizacoes: number;
  percentualCrescimentoVisualizacoes: number;
  likesIniciais: number;
  likesFinais: number;
  crescimentoLikes: number;
  percentualCrescimentoLikes: number;
}

interface GrowthReport {
  estatisticasDiarias: DailyStats[];
  dataInicio: string;
  dataFim: string;
  percentualCrescimentoVisualizacoes: number;
  percentualCrescimentoLikes: number;
  visualizacoesIniciais: number;
  visualizacoesFinais: number;
  likesIniciais: number;
  likesFinais: number;
  videoComMaiorCrescimentoVisualizacoes?: VideoGrowth;
  videoComMaiorCrescimentoLikes?: VideoGrowth;
  crescimentoPorVideo?: VideoGrowth[];
}

export class ReportService {
  /**
   * Gera um relatório de crescimento para um intervalo de datas (para uma playlist inteira)
   */
  generateGrowthReport(
    videos: PlaylistVideoItem[], 
    startDate: Date, 
    endDate: Date
  ): GrowthReport {
    // Como não temos dados históricos reais, vamos simular:
    // 1. Criar dados diários com crescimento gradual
    const dailyStats: DailyStats[] = [];
    
    // Criar uma cópia ordenada dos vídeos por visualizações
    const sortedByViews = [...videos].sort((a, b) => 
      (b.viewCount || 0) - (a.viewCount || 0)
    );
    
    // Criar uma cópia ordenada dos vídeos por likes
    const sortedByLikes = [...videos].sort((a, b) => 
      (b.likeCount || 0) - (a.likeCount || 0)
    );
    
    if (sortedByViews.length === 0) {
      return {
        estatisticasDiarias: [],
        dataInicio: format(startDate, 'dd/MM/yyyy'),
        dataFim: format(endDate, 'dd/MM/yyyy'),
        percentualCrescimentoVisualizacoes: 0,
        percentualCrescimentoLikes: 0,
        visualizacoesIniciais: 0,
        visualizacoesFinais: 0,
        likesIniciais: 0,
        likesFinais: 0
      };
    }
    
    // Para simulação, usaremos o número total atual e distribuiremos no período
    const totalViews = sortedByViews.reduce((sum, video) => sum + (video.viewCount || 0), 0);
    const totalLikes = sortedByViews.reduce((sum, video) => sum + (video.likeCount || 0), 0);
    
    // Simulamos um crescimento diário aproximadamente linear (apenas para demonstração)
    const days = Math.max(1, this.daysBetween(startDate, endDate));
    const dailyViewsGrowth = totalViews * 0.05 / days; // 5% de crescimento ao longo do período
    const dailyLikesGrowth = totalLikes * 0.03 / days; // 3% de crescimento ao longo do período
    
    // Valores iniciais
    let currentViews = totalViews - (dailyViewsGrowth * days);
    let currentLikes = totalLikes - (dailyLikesGrowth * days);
    
    // Registrar os valores iniciais
    const initialViews = Math.max(0, Math.round(currentViews));
    const initialLikes = Math.max(0, Math.round(currentLikes));

    // Análise de crescimento por vídeo
    const videosGrowth: VideoGrowth[] = videos.map(video => {
      // Fazer uma simulação de crescimento para cada vídeo individualmente
      const initialViewsForVideo = Math.max(0, Math.round((video.viewCount || 0) * 0.95));
      const initialLikesForVideo = Math.max(0, Math.round((video.likeCount || 0) * 0.97));
      const finalViewsForVideo = video.viewCount || 0;
      const finalLikesForVideo = video.likeCount || 0;
      
      const viewsGrowth = finalViewsForVideo - initialViewsForVideo;
      const likesGrowth = finalLikesForVideo - initialLikesForVideo;
      
      const viewsGrowthPercentage = initialViewsForVideo > 0 
        ? (viewsGrowth / initialViewsForVideo) * 100 
        : 0;
        
      const likesGrowthPercentage = initialLikesForVideo > 0 
        ? (likesGrowth / initialLikesForVideo) * 100 
        : 0;
      
      return {
        videoId: video.videoId,
        titulo: video.title,
        visualizacoesIniciais: initialViewsForVideo,
        visualizacoesFinais: finalViewsForVideo,
        crescimentoVisualizacoes: viewsGrowth,
        percentualCrescimentoVisualizacoes: parseFloat(viewsGrowthPercentage.toFixed(2)),
        likesIniciais: initialLikesForVideo,
        likesFinais: finalLikesForVideo,
        crescimentoLikes: likesGrowth,
        percentualCrescimentoLikes: parseFloat(likesGrowthPercentage.toFixed(2))
      };
    });
    
    // Encontrar o vídeo com maior crescimento de views (em %)
    const videoWithHighestViewsGrowth = [...videosGrowth].sort((a, b) => 
      b.percentualCrescimentoVisualizacoes - a.percentualCrescimentoVisualizacoes
    )[0];
    
    // Encontrar o vídeo com maior crescimento de likes (em %)
    const videoWithHighestLikesGrowth = [...videosGrowth].sort((a, b) => 
      b.percentualCrescimentoLikes - a.percentualCrescimentoLikes
    )[0];
    
    // Para cada dia no intervalo
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      currentViews += dailyViewsGrowth;
      currentLikes += dailyLikesGrowth;
      
      // Calculamos quais vídeos teriam as maiores visualizações/likes nesse dia
      // (baseado na proporção atual)
      const topVideoViews = sortedByViews[0];
      const topVideoLikes = sortedByLikes[0];
      
      dailyStats.push({
        data: format(currentDate, 'dd/MM/yyyy', { locale: ptBR }),
        maxVisualizacoes: Math.round(currentViews / videos.length * (1.5 + Math.random())),
        maxLikes: Math.round(currentLikes / videos.length * (1.2 + Math.random())),
        videoComMaxVisualizacoes: topVideoViews.title,
        videoComMaxLikes: topVideoLikes.title
      });
      
      // Avança para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calcular percentual de crescimento
    const viewsGrowth = ((totalViews - initialViews) / Math.max(1, initialViews)) * 100;
    const likesGrowth = ((totalLikes - initialLikes) / Math.max(1, initialLikes)) * 100;
    
    return {
      estatisticasDiarias: dailyStats,
      dataInicio: format(startDate, 'dd/MM/yyyy', { locale: ptBR }),
      dataFim: format(endDate, 'dd/MM/yyyy', { locale: ptBR }),
      percentualCrescimentoVisualizacoes: parseFloat(viewsGrowth.toFixed(2)),
      percentualCrescimentoLikes: parseFloat(likesGrowth.toFixed(2)),
      visualizacoesIniciais: initialViews,
      visualizacoesFinais: totalViews,
      likesIniciais: initialLikes,
      likesFinais: totalLikes,
      videoComMaiorCrescimentoVisualizacoes: videoWithHighestViewsGrowth,
      videoComMaiorCrescimentoLikes: videoWithHighestLikesGrowth,
      crescimentoPorVideo: videosGrowth
    };
  }

  /**
   * Gera um relatório de crescimento para um vídeo individual no intervalo de datas
   */
  generateVideoGrowthReport(
    video: PlaylistVideoItem,
    startDate: Date, 
    endDate: Date
  ): GrowthReport {
    const dailyStats: DailyStats[] = [];
    
    if (!video || !video.viewCount) {
      return {
        estatisticasDiarias: [],
        dataInicio: format(startDate, 'dd/MM/yyyy'),
        dataFim: format(endDate, 'dd/MM/yyyy'),
        percentualCrescimentoVisualizacoes: 0,
        percentualCrescimentoLikes: 0,
        visualizacoesIniciais: 0,
        visualizacoesFinais: 0,
        likesIniciais: 0,
        likesFinais: 0
      };
    }
    
    // Para simulação, usaremos o número atual e distribuiremos no período
    const finalViews = video.viewCount || 0;
    const finalLikes = video.likeCount || 0;
    
    // Simulamos um crescimento diário aproximadamente linear
    const days = Math.max(1, this.daysBetween(startDate, endDate));
    const dailyViewsGrowth = finalViews * 0.05 / days; // 5% de crescimento ao longo do período
    const dailyLikesGrowth = finalLikes * 0.03 / days; // 3% de crescimento ao longo do período
    
    // Valores iniciais
    let currentViews = finalViews - (dailyViewsGrowth * days);
    let currentLikes = finalLikes - (dailyLikesGrowth * days);
    
    // Registrar os valores iniciais
    const initialViews = Math.max(0, Math.round(currentViews));
    const initialLikes = Math.max(0, Math.round(currentLikes));
    
    // Análise de crescimento do vídeo
    const videoGrowth: VideoGrowth = {
      videoId: video.videoId,
      titulo: video.title,
      visualizacoesIniciais: initialViews,
      visualizacoesFinais: finalViews,
      crescimentoVisualizacoes: finalViews - initialViews,
      percentualCrescimentoVisualizacoes: initialViews > 0 ? ((finalViews - initialViews) / initialViews) * 100 : 0,
      likesIniciais: initialLikes,
      likesFinais: finalLikes,
      crescimentoLikes: finalLikes - initialLikes,
      percentualCrescimentoLikes: initialLikes > 0 ? ((finalLikes - initialLikes) / initialLikes) * 100 : 0
    };
    
    // Para cada dia no intervalo
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      currentViews += dailyViewsGrowth;
      currentLikes += dailyLikesGrowth;
      
      dailyStats.push({
        data: format(currentDate, 'dd/MM/yyyy', { locale: ptBR }),
        maxVisualizacoes: Math.round(currentViews),
        maxLikes: Math.round(currentLikes),
        videoComMaxVisualizacoes: video.title,
        videoComMaxLikes: video.title
      });
      
      // Avança para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calcular percentual de crescimento
    const viewsGrowthPercentage = initialViews > 0 ? ((finalViews - initialViews) / initialViews) * 100 : 0;
    const likesGrowthPercentage = initialLikes > 0 ? ((finalLikes - initialLikes) / initialLikes) * 100 : 0;
    
    return {
      estatisticasDiarias: dailyStats,
      dataInicio: format(startDate, 'dd/MM/yyyy', { locale: ptBR }),
      dataFim: format(endDate, 'dd/MM/yyyy', { locale: ptBR }),
      percentualCrescimentoVisualizacoes: parseFloat(viewsGrowthPercentage.toFixed(2)),
      percentualCrescimentoLikes: parseFloat(likesGrowthPercentage.toFixed(2)),
      visualizacoesIniciais: initialViews,
      visualizacoesFinais: finalViews,
      likesIniciais: initialLikes,
      likesFinais: finalLikes,
      crescimentoPorVideo: [videoGrowth]
    };
  }
  
  /**
   * Converte o relatório para CSV
   */
  convertReportToCSV(report: GrowthReport): string {
    // Cabeçalho CSV com formatação melhorada
    let csv = "RELATÓRIO DE CRESCIMENTO DO YOUTUBE\n";
    csv += `Exportado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n`;
    
    // Seção de informações gerais
    csv += "=== INFORMAÇÕES GERAIS ===\n";
    csv += `Período analisado: ${report.dataInicio} a ${report.dataFim}\n\n`;
    
    // Seção de estatísticas de crescimento
    csv += "=== ESTATÍSTICAS DE CRESCIMENTO ===\n";
    csv += `Visualizações: ${report.visualizacoesIniciais.toLocaleString('pt-BR')} → ${report.visualizacoesFinais.toLocaleString('pt-BR')}\n`;
    csv += `Crescimento de visualizações: ${(report.visualizacoesFinais - report.visualizacoesIniciais).toLocaleString('pt-BR')} (${report.percentualCrescimentoVisualizacoes.toFixed(2)}%)\n`;
    csv += `Likes: ${report.likesIniciais.toLocaleString('pt-BR')} → ${report.likesFinais.toLocaleString('pt-BR')}\n`;
    csv += `Crescimento de likes: ${(report.likesFinais - report.likesIniciais).toLocaleString('pt-BR')} (${report.percentualCrescimentoLikes.toFixed(2)}%)\n\n`;
    
    // Seção de vídeos em destaque
    csv += "=== VÍDEOS EM DESTAQUE ===\n";
    
    // Vídeo com maior crescimento de visualizações
    if (report.videoComMaiorCrescimentoVisualizacoes) {
      const videoViews = report.videoComMaiorCrescimentoVisualizacoes;
      csv += "Vídeo com maior crescimento de visualizações:\n";
      csv += `- Título: "${this.escapeCsvValue(videoViews.titulo)}"\n`;
      csv += `- ID: ${videoViews.videoId}\n`;
      csv += `- Visualizações: ${videoViews.visualizacoesIniciais.toLocaleString('pt-BR')} → ${videoViews.visualizacoesFinais.toLocaleString('pt-BR')}\n`;
      csv += `- Crescimento: ${videoViews.crescimentoVisualizacoes.toLocaleString('pt-BR')} visualizações (${videoViews.percentualCrescimentoVisualizacoes.toFixed(2)}%)\n\n`;
    }
    
    // Vídeo com maior crescimento de likes
    if (report.videoComMaiorCrescimentoLikes) {
      const videoLikes = report.videoComMaiorCrescimentoLikes;
      csv += "Vídeo com maior crescimento de likes:\n";
      csv += `- Título: "${this.escapeCsvValue(videoLikes.titulo)}"\n`;
      csv += `- ID: ${videoLikes.videoId}\n`;
      csv += `- Likes: ${videoLikes.likesIniciais.toLocaleString('pt-BR')} → ${videoLikes.likesFinais.toLocaleString('pt-BR')}\n`;
      csv += `- Crescimento: ${videoLikes.crescimentoLikes.toLocaleString('pt-BR')} likes (${videoLikes.percentualCrescimentoLikes.toFixed(2)}%)\n\n`;
    }
    
    // Crescimento por vídeo
    if (report.crescimentoPorVideo && report.crescimentoPorVideo.length > 0) {
      csv += "=== CRESCIMENTO DETALHADO POR VÍDEO ===\n";
      // Cabeçalhos em português
      csv += "ID do Vídeo,Título,Visualizações Iniciais,Visualizações Finais,Crescimento de Views,Crescimento %,Likes Iniciais,Likes Finais,Crescimento de Likes,Crescimento %\n";
      
      report.crescimentoPorVideo.forEach(videoGrowth => {
        csv += `${videoGrowth.videoId},"${this.escapeCsvValue(videoGrowth.titulo)}",` +
               `${videoGrowth.visualizacoesIniciais.toLocaleString('pt-BR')},` +
               `${videoGrowth.visualizacoesFinais.toLocaleString('pt-BR')},` +
               `${videoGrowth.crescimentoVisualizacoes.toLocaleString('pt-BR')},` +
               `${videoGrowth.percentualCrescimentoVisualizacoes.toFixed(2)}%,` +
               `${videoGrowth.likesIniciais.toLocaleString('pt-BR')},` +
               `${videoGrowth.likesFinais.toLocaleString('pt-BR')},` +
               `${videoGrowth.crescimentoLikes.toLocaleString('pt-BR')},` +
               `${videoGrowth.percentualCrescimentoLikes.toFixed(2)}%\n`;
      });
      
      csv += "\n";
    }
    
    // Dados diários
    csv += "=== ESTATÍSTICAS DIÁRIAS ===\n";
    csv += 'Data,Máximo de Visualizações,Vídeo com Mais Visualizações,Máximo de Likes,Vídeo com Mais Likes\n';
    
    report.estatisticasDiarias.forEach(day => {
      csv += `${day.data},` +
             `${day.maxVisualizacoes.toLocaleString('pt-BR')},` +
             `"${this.escapeCsvValue(day.videoComMaxVisualizacoes)}",` +
             `${day.maxLikes.toLocaleString('pt-BR')},` +
             `"${this.escapeCsvValue(day.videoComMaxLikes)}"\n`;
    });
    
    return csv;
  }
  
  /**
   * Converte o relatório para JSON
   */
  convertReportToJSON(report: GrowthReport): string {
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Faz download do relatório em CSV
   */
  downloadReportCSV(report: GrowthReport, fileName: string): void {
    const csv = this.convertReportToCSV(report);
    this.downloadFile(csv, fileName, 'text/csv');
  }
  
  /**
   * Faz download do relatório em JSON
   */
  downloadReportJSON(report: GrowthReport, fileName: string): void {
    const json = this.convertReportToJSON(report);
    this.downloadFile(json, fileName, 'application/json');
  }
  
  /**
   * Calcula o número de dias entre duas datas
   */
  private daysBetween(startDate: Date, endDate: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // milissegundos em um dia
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / oneDay);
  }
  
  /**
   * Escapa valores para CSV
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return value.replace(/"/g, '""');
    }
    return value;
  }
  
  /**
   * Cria e dispara o download do arquivo
   */
  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Exporta snapshots para CSV
   */
  exportSnapshotsToCSV(snapshots: Snapshot[], fileName: string): void {
    if (!snapshots || snapshots.length === 0) {
      console.warn('Nenhum snapshot para exportar');
      return;
    }
    
    // Detectar todas as playlists únicas nos snapshots
    const uniquePlaylists = new Map<string, string>(); // Map de ID da playlist para nome
    snapshots.forEach(snapshot => {
      if (snapshot.playlists && Array.isArray(snapshot.playlists)) {
        snapshot.playlists.forEach((playlist: any) => {
          const playlistId = playlist.playlistId || '';
          const playlistTitle = playlist.playlistTitle || 'Playlist sem título';
          if (playlistId && !uniquePlaylists.has(playlistId)) {
            uniquePlaylists.set(playlistId, playlistTitle);
          }
        });
      }
    });
    
    // Mapear os snapshots para garantir que objetos sejam convertidos em texto
    // e traduzir as chaves para português
    const processedSnapshots = snapshots.map(snapshot => {
      const processed: Record<string, any> = {};
      
      // Processar cada campo do snapshot
      Object.entries(snapshot).forEach(([key, value]) => {
        // Não processar o campo 'playlists' aqui, vamos tratá-lo separadamente
        if (key === 'playlists') return;
        
        // Traduzir as chaves para português ao mesmo tempo que processa
        let portugueseKey = this.translateKeyToPortuguese(key);
        
        if (value === null || value === undefined) {
          processed[portugueseKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Converter objetos para JSON string
          processed[portugueseKey] = JSON.stringify(value);
        } else if (Array.isArray(value)) {
          // Para arrays, converter para string de itens separados por ponto e vírgula
          processed[portugueseKey] = value.map(item => 
            typeof item === 'object' ? 
              (item.playlistTitle || item.title || JSON.stringify(item)) : 
              String(item)
          ).join('; ');
        } else if (key === 'date' || key === 'lastUpdated' || key.includes('Data')) {
          // Formatar datas para o padrão brasileiro
          try {
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
              processed[portugueseKey] = format(dateValue, 'dd/MM/yyyy HH:mm', { locale: ptBR });
            } else {
              processed[portugueseKey] = value;
            }
          } catch (e) {
            processed[portugueseKey] = value;
          }
        } else {
          processed[portugueseKey] = value;
        }
      });
      
      // Adicionar cada playlist como uma coluna separada
      if (snapshot.playlists && Array.isArray(snapshot.playlists)) {
        uniquePlaylists.forEach((playlistTitle, playlistId) => {
          // Verificar se este snapshot contém esta playlist
          const found = snapshot.playlists.some((p: any) => p.playlistId === playlistId);
          // Criar uma coluna com o nome da playlist
          processed[`Playlist: ${playlistTitle}`] = found ? 'Sim' : 'Não';
        });
      } else {
        // Se não houver playlists, definir todas como 'Não'
        uniquePlaylists.forEach((playlistTitle) => {
          processed[`Playlist: ${playlistTitle}`] = 'Não';
        });
      }
      
      return processed;
    });

    // Reorganizar e traduzir as chaves em uma ordem mais lógica
    const orderedKeys = [
      'Data', 'VideoId', 'Titulo', 'TotalVisualizacoes', 'Likes'
    ];
    
    // Filtrando as chaves que existem nos snapshots
    const availableOrderedKeys = orderedKeys.filter(key => 
      processedSnapshots.some(snapshot => Object.keys(snapshot).includes(key))
    );
    
    // Adicionando chaves que não estão na lista ordenada, mas existem nos snapshots
    // (excluindo as colunas de playlist que serão adicionadas separadamente)
    const allKeys = new Set<string>();
    processedSnapshots.forEach(snapshot => {
      Object.keys(snapshot)
        .filter(key => !key.startsWith('Playlist: '))
        .forEach(key => allKeys.add(key));
    });
    
    // Montar o conjunto final de cabeçalhos, colocando playlists no final
    const headers = [
      ...availableOrderedKeys,
      ...Array.from(allKeys).filter(key => !availableOrderedKeys.includes(key) && !key.startsWith('Playlist: ')),
    ];
    
    // Adicionar as colunas de playlist
    const playlistHeaders = Array.from(uniquePlaylists.values()).map(title => `Playlist: ${title}`);
    
    // Adicionar um cabeçalho descritivo em português
    let csvContent = "RELATÓRIO DE DADOS DO YOUTUBE\n";
    csvContent += `Exportado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n`;
    
    // Adicionar informação sobre o conteúdo se possível determinar o tipo
    if (snapshots.length > 0) {
      if (snapshots[0].videoId && !snapshots[0].playlistId) {
        csvContent += "DADOS DE VÍDEO\n";
        
        // Tentar encontrar o título do vídeo
        const videoTitle = snapshots.find(s => s.title || s.Titulo)?.title || snapshots.find(s => s.title || s.Titulo)?.Titulo || snapshots[0].videoId;
        csvContent += `Vídeo: ${videoTitle}\n`;
        csvContent += `ID: ${snapshots[0].videoId}\n\n`;
        csvContent += `Playlists associadas: ${uniquePlaylists.size}\n\n`;
      } else if (snapshots[0].playlistId && !snapshots[0].videoId) {
        csvContent += "DADOS DE PLAYLIST\n";
        csvContent += `ID da Playlist: ${snapshots[0].playlistId}\n\n`;
      } else {
        csvContent += "DADOS CONSOLIDADOS\n\n";
      }
      
      // Adicionar estatísticas gerais
      if (snapshots.length > 1) {
        const firstSnapshot = snapshots[0];
        const lastSnapshot = snapshots[snapshots.length - 1];
        const initialViews = firstSnapshot.totalViews || 0;
        const finalViews = lastSnapshot.totalViews || 0;
        const growthViews = finalViews - initialViews;
        const growthPercentage = initialViews > 0 ? (growthViews / initialViews) * 100 : 0;
        
        csvContent += "RESUMO DO PERÍODO\n";
        csvContent += `Período analisado: ${snapshots.length} snapshots\n`;
        csvContent += `Primeira data: ${processedSnapshots[0]['Data'] || 'N/A'}\n`;
        csvContent += `Última data: ${processedSnapshots[processedSnapshots.length - 1]['Data'] || 'N/A'}\n`;
        csvContent += `Visualizações iniciais: ${initialViews.toLocaleString('pt-BR')}\n`;
        csvContent += `Visualizações finais: ${finalViews.toLocaleString('pt-BR')}\n`;
        csvContent += `Crescimento: ${growthViews.toLocaleString('pt-BR')} visualizações (${growthPercentage.toFixed(2)}%)\n\n`;
      }
    }
    
    // Separador claro para os dados
    csvContent += "=== DADOS DETALHADOS ===\n";
    
    // Montar cabeçalhos completos incluindo playlists
    const completeHeaders = [...headers, ...playlistHeaders];
    
    // Adicionar cabeçalhos da tabela
    csvContent += completeHeaders.join(',') + '\n';
    
    // Criar linhas com dados
    const rows = processedSnapshots.map(snapshot => 
      completeHeaders.map(header => {
        const value = snapshot[header];
        if (value === undefined || value === null) return '';
        
        // Se for um número, formatar sem aspas
        if (typeof value === 'number') {
          return value;
        }
        
        // Escapar texto para o CSV
        return `"${this.escapeCsvValue(String(value))}"`;
      }).join(',')
    );
    
    // Juntar linhas ao conteúdo
    csvContent += rows.join('\n');
    
    // Download do arquivo
    this.downloadFile(csvContent, fileName, 'text/csv;charset=utf-8');
  }
  
  /**
   * Traduz chaves para português para melhor visualização no CSV
   */
  private translateKeyToPortuguese(key: string): string {
    const translations: Record<string, string> = {
      'id': 'ID',
      'date': 'Data',
      'totalViews': 'TotalVisualizacoes',
      'playlistId': 'PlaylistId',
      'videoId': 'VideoId',
      'title': 'Titulo',
      'playlists': 'Playlists',
      'likes': 'Likes',
      'description': 'Descricao',
      'viewCount': 'TotalVisualizacoes',
      'likeCount': 'Likes',
      'dislikeCount': 'Dislikes',
      'publishedAt': 'DataPublicacao',
      'lastUpdated': 'UltimaAtualizacao',
      'channelId': 'CanalId',
      'channelTitle': 'NomeCanal',
      'position': 'Posicao',
      'dailyViews': 'VisualizacoesDiarias',
      'dailyLikes': 'LikesDiarios'
    };
    
    // Retorna a tradução ou a chave original se não houver tradução
    return translations[key] || key;
  }
  
  /**
   * Exporta snapshots para JSON
   */
  exportSnapshotsToJSON(snapshots: Snapshot[], fileName: string): void {
    if (!snapshots || snapshots.length === 0) {
      console.warn('Nenhum snapshot para exportar');
      return;
    }
    
    const jsonContent = JSON.stringify(snapshots, null, 2);
    this.downloadFile(jsonContent, fileName, 'application/json');
  }
}

export const reportService = new ReportService(); 