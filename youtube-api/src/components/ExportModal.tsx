import React from 'react';
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
  if (!isOpen) return null;
  
  const handleExportCSV = () => {
    if (isPlaylist && playlistTitle && playlistVideos) {
      exportService.exportPlaylistToCSV(playlistTitle, playlistVideos);
    } else if (!isPlaylist && video) {
      exportService.exportVideoToCSV(video);
    }
    onClose();
  };
  
  const handleExportJSON = () => {
    if (isPlaylist && playlistTitle && playlistVideos) {
      exportService.exportPlaylistToJSON(playlistTitle, playlistVideos);
    } else if (!isPlaylist && video) {
      exportService.exportVideoToJSON(video);
    }
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md p-6 shadow-xl border border-gray-800">
        <h3 className="text-xl font-semibold text-white mb-4">
          Exportar {isPlaylist ? 'Playlist' : 'Vídeo'}
        </h3>
        
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