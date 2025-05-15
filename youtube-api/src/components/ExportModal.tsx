import React, { useState } from 'react';
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

import { exportService } from '../services/exportService';
import { reportService } from '../services/reportService';
import DateRangePicker from './DateRangePicker';

// Modo de exportação
type ExportMode = 'standard' | 'growth-report';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  video?: PlaylistVideoItem;
  playlistTitle?: string;
  playlistVideos?: PlaylistVideoItem[];
  isPlaylist: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  video, 
  playlistTitle, 
  playlistVideos, 
  isPlaylist 
}) => {
  const [exportMode, setExportMode] = useState<ExportMode>('standard');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7))); // 7 dias atrás
  const [endDate, setEndDate] = useState<Date>(new Date()); // Hoje

  if (!isOpen) return null;
  
  const handleExportCSV = () => {
    if (exportMode === 'standard') {
      if (isPlaylist && playlistTitle && playlistVideos) {
        exportService.exportPlaylistToCSV(playlistTitle, playlistVideos);
      } else if (!isPlaylist && video) {
        exportService.exportVideoToCSV(video);
      }
    } else if (exportMode === 'growth-report') {
      if (isPlaylist && playlistVideos && playlistVideos.length > 0) {
        const report = reportService.generateGrowthReport(playlistVideos, startDate, endDate);
        reportService.downloadReportCSV(report, `relatorio-${playlistTitle || 'videos'}-${report.dataInicio}-${report.dataFim}.csv`);
      } else if (!isPlaylist && video) {
        const report = reportService.generateVideoGrowthReport(video, startDate, endDate);
        reportService.downloadReportCSV(report, `relatorio-video-${video.title}-${report.dataInicio}-${report.dataFim}.csv`);
      }
    }
    onClose();
  };
  
  const handleExportJSON = () => {
    if (exportMode === 'standard') {
      if (isPlaylist && playlistTitle && playlistVideos) {
        exportService.exportPlaylistToJSON(playlistTitle, playlistVideos);
      } else if (!isPlaylist && video) {
        exportService.exportVideoToJSON(video);
      }
    } else if (exportMode === 'growth-report') {
      if (isPlaylist && playlistVideos && playlistVideos.length > 0) {
        const report = reportService.generateGrowthReport(playlistVideos, startDate, endDate);
        reportService.downloadReportJSON(report, `relatorio-${playlistTitle || 'videos'}-${report.dataInicio}-${report.dataFim}.json`);
      } else if (!isPlaylist && video) {
        const report = reportService.generateVideoGrowthReport(video, startDate, endDate);
        reportService.downloadReportJSON(report, `relatorio-video-${video.title}-${report.dataInicio}-${report.dataFim}.json`);
      }
    }
    onClose();
  };
  
  // Função para gerenciar a mudança de datas
  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md p-6 shadow-xl border border-gray-800">
        <h3 className="text-xl font-semibold text-white mb-4">
          Exportar {isPlaylist ? 'Playlist' : 'Vídeo'}
        </h3>
        
        <div className="mb-6">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setExportMode('standard')}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex-1 ${
                exportMode === 'standard' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              Exportação Padrão
            </button>
            <button
              onClick={() => setExportMode('growth-report')}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex-1 ${
                exportMode === 'growth-report' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              Relatório de Crescimento
            </button>
          </div>
          
          {exportMode === 'growth-report' && (
            <div className="mb-6 bg-[#2a2a2a] rounded-md p-4 border border-gray-700">
              <h4 className="text-white text-sm mb-3 font-medium">Selecione o período do relatório</h4>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateRangeChange}
              />
              <p className="mt-3 text-xs text-gray-400 italic">
                O relatório vai analisar o crescimento diário de views e likes no período selecionado.
              </p>
            </div>
          )}
        </div>
        
        <p className="text-gray-300 mb-6">
          Escolha o formato para exportar os dados {isPlaylist ? 'da playlist' : 'do vídeo'}:
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExportCSV}
            className="bg-[#2a2a2a] hover:bg-[#333] text-white py-3 px-4 rounded-md transition-colors flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-green-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.125-3.75h7.5c.621 0 1.125.504 1.125 1.125m-9.75 0V10.5m0 2.25v.75c0 .621.504 1.125 1.125 1.125h7.5m-7.5 0h7.5m0 0v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375m7.5-.375v.75m0-.75h7.5" />
            </svg>
            <span>CSV</span>
          </button>
          
          <button
            onClick={handleExportJSON}
            className="bg-[#2a2a2a] hover:bg-[#333] text-white py-3 px-4 rounded-md transition-colors flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
            <span>JSON</span>
          </button>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal; 