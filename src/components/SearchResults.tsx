import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SearchResultProps {
  video: {
    id: string;
    title: string;
    thumbnailUrl: string;
    viewCount: number;
    playlists?: {
      id: string;
      title: string;
      viewCount: number;
      percentageContribution: number;
    }[];
  };
  onViewPlaylist?: (playlistId: string) => void;
}

const SearchResult: React.FC<SearchResultProps> = ({ video, onViewPlaylist }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-4">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-48 h-27 object-cover rounded"
        />
        <div className="flex-1">
          <h3 className="text-xl text-white mb-2">{video.title}</h3>
          <div className="flex items-center gap-4 text-gray-300 mb-4">
            <div>
              <span className="font-semibold">{video.viewCount.toLocaleString()}</span> visualizações totais
            </div>
            {video.playlists && (
              <div>
                Presente em <span className="font-semibold">{video.playlists.length}</span> playlists
              </div>
            )}
          </div>
          
          {video.playlists && video.playlists.length > 0 && (
            <div className="mt-2">
              <h4 className="text-gray-300 mb-2 font-medium">Impacto por Playlist:</h4>
              <div className="grid gap-2">
                {video.playlists.map(playlist => (
                  <div 
                    key={playlist.id} 
                    className="bg-gray-700 p-2 rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="text-white">{playlist.title}</div>
                      <div className="text-sm text-gray-400">
                        {playlist.viewCount.toLocaleString()} views
                        {' '}
                        <span className="text-blue-400">
                          ({playlist.percentageContribution.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    {onViewPlaylist && (
                      <button
                        onClick={() => onViewPlaylist(playlist.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Ver Playlist
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SearchResultsProps {
  results: {
    id: string;
    title: string;
    thumbnailUrl: string;
    viewCount: number;
    playlists?: {
      id: string;
      title: string;
      viewCount: number;
      percentageContribution: number;
    }[];
  }[];
  onViewPlaylist?: (playlistId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onViewPlaylist }) => {
  if (results.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Nenhum resultado encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map(video => (
        <SearchResult 
          key={video.id} 
          video={video} 
          onViewPlaylist={onViewPlaylist}
        />
      ))}
    </div>
  );
}; 