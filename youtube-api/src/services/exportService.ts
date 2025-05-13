// Definição local da interface PlaylistVideoItem para evitar problemas de importação
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

interface ExportData {
  title: string;
  viewCount: number;
  likeCount: number;
  lastUpdated: string;
}

export class ExportService {
  /**
   * Exporta dados de um vídeo para CSV
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
   * Converte array de objetos para formato CSV
   */
  private convertToCSV(data: ExportData[]): string {
    // Cabeçalho CSV
    const header = 'Título,Visualizações,Likes,Atualizado em\n';
    
    // Linhas de dados
    const rows = data.map(item => {
      const title = this.escapeCsvValue(item.title);
      const viewCount = item.viewCount;
      const likeCount = item.likeCount;
      const lastUpdated = new Date(item.lastUpdated).toLocaleString('pt-BR');
      
      return `${title},${viewCount},${likeCount},${lastUpdated}`;
    }).join('\n');
    
    return header + rows;
  }
  
  /**
   * Escapa valores para CSV (evita problemas com vírgulas no texto)
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Substitui aspas duplas por duas aspas duplas e envolve em aspas
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  
  /**
   * Sanitiza o nome do arquivo removendo caracteres inválidos
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[\/\\:*?"<>|]/g, '_')  // Substitui caracteres inválidos por underscores
      .substring(0, 100);  // Limita o tamanho do nome do arquivo
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

export const exportService = new ExportService(); 