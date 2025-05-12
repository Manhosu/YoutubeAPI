import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { findPlaylistsWithVideo, getVideoDetails } from '../lib/youtube';

interface VideoDetails {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
}

interface PlaylistWithVideo {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
    };
  };
  contentDetails?: {
    itemCount?: number;
  };
  addedAt?: string;
}

const Search = () => {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistWithVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<string | null>(null);

  // Check if user is authenticated
  if (!isLoading && !user) {
    navigate('/login');
  }

  // Extract video ID from various input formats
  const extractVideoId = (input: string): string | null => {
    // Full URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
    const urlRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/i;
    const urlMatch = input.match(urlRegex);
    if (urlMatch) return urlMatch[1];
    
    // Just the ID (if it's exactly 11 chars and only contains valid characters)
    const idRegex = /^[a-zA-Z0-9_-]{11}$/;
    if (idRegex.test(input)) return input;
    
    return null;
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim() || !session?.provider_token) return;
    
    const videoId = extractVideoId(searchQuery);
    if (!videoId) {
      setError('Invalid YouTube video URL or ID. Please enter a valid YouTube video URL or ID.');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    setVideoDetails(null);
    setPlaylists([]);
    setExportData(null);
    
    try {
      const accessToken = session.provider_token;
      
      // Get video details
      const video = await getVideoDetails(accessToken, videoId);
      setVideoDetails(video || null);
      
      if (!video) {
        setError('Video not found. Please check the URL or ID and try again.');
        setIsSearching(false);
        return;
      }
      
      // Find playlists containing this video
      const playlistsWithVideo = await findPlaylistsWithVideo(accessToken, videoId);
      setPlaylists(playlistsWithVideo);
      
      // Prepare export data
      const exportObj = {
        video: {
          id: video.id,
          title: video.snippet?.title,
          channelTitle: video.snippet?.channelTitle,
          viewCount: video.statistics?.viewCount,
          publishedAt: video.snippet?.publishedAt
        },
        playlists: playlistsWithVideo.map(playlist => ({
          id: playlist.id,
          title: playlist.snippet?.title,
          itemCount: playlist.contentDetails?.itemCount,
          addedAt: playlist.addedAt
        }))
      };
      
      setExportData(JSON.stringify(exportObj, null, 2));
      
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = (type: 'json' | 'csv') => {
    if (!videoDetails || !exportData) return;
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (type === 'json') {
      content = exportData;
      filename = `video-${videoDetails.id}-playlists.json`;
      mimeType = 'application/json';
    } else {
      // Create CSV
      const header = 'Playlist ID,Playlist Title,Video Count,Added Date\n';
      const rows = playlists.map(playlist => 
        `${playlist.id},"${playlist.snippet?.title?.replace(/"/g, '""')}",${playlist.contentDetails?.itemCount},"${playlist.addedAt}"`
      ).join('\n');
      content = header + rows;
      filename = `video-${videoDetails.id}-playlists.csv`;
      mimeType = 'text/csv';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Find Video in Playlists</h1>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter YouTube video URL or ID"
              className="flex-grow px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              required
            />
            <button 
              type="submit" 
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {isSearching && (
          <div className="flex justify-center items-center h-32">
            <div className="text-xl">Searching...</div>
          </div>
        )}
        
        {/* Video Details */}
        {videoDetails && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Video Details</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="md:flex">
                {videoDetails.snippet?.thumbnails?.medium?.url && (
                  <img 
                    src={videoDetails.snippet.thumbnails.medium.url}
                    alt={videoDetails.snippet?.title}
                    className="w-full md:w-64 h-auto object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg">{videoDetails.snippet?.title}</h3>
                  <p className="text-gray-600 mt-1">
                    Channel: {videoDetails.snippet?.channelTitle}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Published: {new Date(videoDetails.snippet?.publishedAt || '').toLocaleDateString()}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold">{parseInt(videoDetails.statistics?.viewCount || '0').toLocaleString()}</span> views
                    {videoDetails.statistics?.likeCount && (
                      <span className="ml-3">
                        <span className="font-semibold">{parseInt(videoDetails.statistics.likeCount).toLocaleString()}</span> likes
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Playlists Results */}
        {videoDetails && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Found in {playlists.length} Playlists</h2>
              
              {playlists.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExport('json')}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                  >
                    Export CSV
                  </button>
                </div>
              )}
            </div>
            
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playlists.map(playlist => (
                  <div key={playlist.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="md:flex">
                      {playlist.snippet?.thumbnails?.default?.url && (
                        <img 
                          src={playlist.snippet.thumbnails.default.url}
                          alt={playlist.snippet?.title}
                          className="w-full md:w-32 h-auto object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-bold">{playlist.snippet?.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {playlist.contentDetails?.itemCount} videos
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          Added: {new Date(playlist.addedAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>This video was not found in any of your playlists.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search; 