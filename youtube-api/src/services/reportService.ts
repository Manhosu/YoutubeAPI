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
    // Cabeçalho CSV
    let csv = 'Relatório de Crescimento\n';
    csv += `Período: ${report.dataInicio} a ${report.dataFim}\n\n`;
    csv += `Visualizações Totais: ${report.visualizacoesIniciais} → ${report.visualizacoesFinais} (${report.percentualCrescimentoVisualizacoes}% de crescimento)\n`;
    csv += `Likes Totais: ${report.likesIniciais} → ${report.likesFinais} (${report.percentualCrescimentoLikes}% de crescimento)\n\n`;
    
    // Vídeo com maior crescimento de visualizações
    if (report.videoComMaiorCrescimentoVisualizacoes) {
      csv += `Vídeo com maior crescimento de visualizações: "${report.videoComMaiorCrescimentoVisualizacoes.titulo}"\n`;
      csv += `- Crescimento: ${report.videoComMaiorCrescimentoVisualizacoes.crescimentoVisualizacoes} visualizações (${report.videoComMaiorCrescimentoVisualizacoes.percentualCrescimentoVisualizacoes}%)\n\n`;
    }
    
    // Vídeo com maior crescimento de likes
    if (report.videoComMaiorCrescimentoLikes) {
      csv += `Vídeo com maior crescimento de likes: "${report.videoComMaiorCrescimentoLikes.titulo}"\n`;
      csv += `- Crescimento: ${report.videoComMaiorCrescimentoLikes.crescimentoLikes} likes (${report.videoComMaiorCrescimentoLikes.percentualCrescimentoLikes}%)\n\n`;
    }
    
    // Crescimento por vídeo
    if (report.crescimentoPorVideo && report.crescimentoPorVideo.length > 0) {
      csv += `\nCrescimento por vídeo:\n`;
      csv += `Título,Views Iniciais,Views Finais,Crescimento de Views,Crescimento %,Likes Iniciais,Likes Finais,Crescimento de Likes,Crescimento %\n`;
      
      report.crescimentoPorVideo.forEach(videoGrowth => {
        csv += `"${this.escapeCsvValue(videoGrowth.titulo)}",${videoGrowth.visualizacoesIniciais},${videoGrowth.visualizacoesFinais},${videoGrowth.crescimentoVisualizacoes},${videoGrowth.percentualCrescimentoVisualizacoes}%,${videoGrowth.likesIniciais},${videoGrowth.likesFinais},${videoGrowth.crescimentoLikes},${videoGrowth.percentualCrescimentoLikes}%\n`;
      });
      
      csv += `\n`;
    }
    
    // Dados diários
    csv += `\nEstatísticas Diárias:\n`;
    csv += 'Data,Máximo de Visualizações,Vídeo,Máximo de Likes,Vídeo\n';
    
    report.estatisticasDiarias.forEach(day => {
      csv += `${day.data},${day.maxVisualizacoes},"${this.escapeCsvValue(day.videoComMaxVisualizacoes)}",${day.maxLikes},"${this.escapeCsvValue(day.videoComMaxLikes)}"\n`;
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
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Limpeza
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

export const reportService = new ReportService(); 