import { PlaylistVideoItem } from './youtubeService';
import { videoTrackingService } from './videoTrackingService';

interface ExportData {
  title: string;
  viewCount: number;
  likeCount: number;
  lastUpdated: string;
  [key: string]: any;
}

interface ChannelExportData {
  id: string;
  title: string;
  subscribers: number; 
  totalViews: number;
  videoCount: number;
  playlists: {
    id: string;
    title: string;
    itemCount: number;
    totalViews: number;
  }[];
}

export class ExportService {
  /**
   * Exporta dados de um único vídeo para CSV
   */
  exportVideoToCSV(video: PlaylistVideoItem): void {
    const data: ExportData = {
      title: video.title,
      viewCount: video.viewCount || 0,
      likeCount: video.likeCount || 0,
      lastUpdated: video.lastUpdated || new Date().toISOString()
    };
    
    const csvContent = this.convertToCSV([data]);
    this.downloadFile(csvContent, `${this.sanitizeFileName(video.title)}.csv`, 'text/csv');
  }
  
  /**
   * Exporta dados de um vídeo para JSON
   */
  exportVideoToJSON(video: PlaylistVideoItem): void {
    const data: ExportData = {
      title: video.title,
      viewCount: video.viewCount || 0,
      likeCount: video.likeCount || 0,
      lastUpdated: video.lastUpdated || new Date().toISOString()
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${this.sanitizeFileName(video.title)}.json`, 'application/json');
  }
  
  /**
   * Exporta dados de uma playlist inteira para CSV
   */
  exportPlaylistToCSV(playlistTitle: string, videos: PlaylistVideoItem[]): void {
    const data: ExportData[] = videos.map(video => ({
      title: video.title,
      viewCount: video.viewCount || 0,
      likeCount: video.likeCount || 0,
      lastUpdated: video.lastUpdated || new Date().toISOString()
    }));
    
    const csvContent = this.convertToCSV(data);
    this.downloadFile(csvContent, `${this.sanitizeFileName(playlistTitle)}.csv`, 'text/csv');
  }
  
  /**
   * Exporta dados de uma playlist inteira para JSON
   */
  exportPlaylistToJSON(playlistTitle: string, videos: PlaylistVideoItem[]): void {
    const data: ExportData[] = videos.map(video => ({
      title: video.title,
      viewCount: video.viewCount || 0,
      likeCount: video.likeCount || 0,
      lastUpdated: video.lastUpdated || new Date().toISOString()
    }));
    
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${this.sanitizeFileName(playlistTitle)}.json`, 'application/json');
  }

  /**
   * Exporta dados completos de um canal para CSV
   */
  exportChannelToCSV(channelData: ChannelExportData): void {
    // Cabeçalho do canal
    let csvContent = `Canal: ${channelData.title}\n`;
    csvContent += `ID: ${channelData.id}\n`;
    csvContent += `Inscritos: ${channelData.subscribers}\n`;
    csvContent += `Total de visualizações: ${channelData.totalViews}\n`;
    csvContent += `Total de vídeos: ${channelData.videoCount}\n\n`;
    
    // Seção de playlists
    csvContent += `Playlists (${channelData.playlists.length}):\n`;
    csvContent += 'ID,Título,Vídeos,Visualizações\n';
    
    channelData.playlists.forEach(playlist => {
      csvContent += `${playlist.id},${this.escapeCSVField(playlist.title)},${playlist.itemCount},${playlist.totalViews}\n`;
    });
    
    this.downloadFile(csvContent, `canal-${this.sanitizeFileName(channelData.title)}.csv`, 'text/csv');
  }
  
  /**
   * Exporta dados completos de um canal para JSON
   */
  exportChannelToJSON(channelData: ChannelExportData): void {
    const jsonContent = JSON.stringify(channelData, null, 2);
    this.downloadFile(jsonContent, `canal-${this.sanitizeFileName(channelData.title)}.json`, 'application/json');
  }

  /**
   * Exporta impacto de playlists em um vídeo
   * Usa o videoTrackingService diretamente para obter dados detalhados
   */
  exportVideoImpactData(videoId: string, format: 'csv' | 'json'): void {
    try {
      videoTrackingService.exportImpactData(videoId, format);
    } catch (error) {
      console.error('Erro ao exportar dados de impacto:', error);
      throw error;
    }
  }

  /**
   * Exporta um conjunto arbitrário de dados para CSV
   */
  exportDataToCSV(data: any, filename: string): void {
    let csvContent;
    
    // Verificar se é um array de objetos
    if (Array.isArray(data)) {
      csvContent = this.convertToCSV(data);
    } else {
      // Para objetos não arrays, criar um formato plano
      csvContent = Object.entries(data)
        .map(([key, value]) => `${key},${this.escapeCSVField(String(value))}`)
        .join('\n');
    }
    
    this.downloadFile(csvContent, `${this.sanitizeFileName(filename)}.csv`, 'text/csv');
  }
  
  /**
   * Exporta um conjunto arbitrário de dados para JSON
   */
  exportDataToJSON(data: any, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${this.sanitizeFileName(filename)}.json`, 'application/json');
  }

  /**
   * Converte array de objetos para formato CSV
   */
  private convertToCSV(items: ExportData[]): string {
    if (items.length === 0) return '';
    
    // Cria cabeçalho com todas as chaves possíveis
    const headers = Object.keys(items[0]);
    
    // Cria linhas de dados
    const rows = items.map(item => 
      headers
        .map(header => this.escapeCSVField(String(item[header] || '')))
        .join(',')
    );
    
    return [
      headers.join(','),
      ...rows
    ].join('\n');
  }
  
  /**
   * Escapa campos para formato CSV
   */
  private escapeCSVField(field: string): string {
    // Se o campo contém vírgulas, quebras de linha ou aspas, envolva em aspas e escape aspas internas
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
  
  /**
   * Sanitiza o nome do arquivo para compatibilidade com sistemas de arquivos
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[/\\?%*:|"<>]/g, '-') // Substitui caracteres inválidos em nomes de arquivo
      .replace(/\s+/g, '_') // Substitui espaços por underscores
      .slice(0, 100); // Limita o tamanho do nome
  }

  /**
   * Faz o download do arquivo
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
}

export const exportService = new ExportService(); 