// Types for YouTube API responses
interface YouTubeChannelResponse {
  items?: Array<any>;
}

interface YouTubePlaylistResponse {
  items?: Array<any>;
}

interface YouTubeVideoResponse {
  items?: Array<any>;
}

// Base YouTube API client for the browser environment
const createYouTubeClient = (accessToken: string) => {
  const baseUrl = 'https://www.googleapis.com/youtube/v3';
  
  // Helper to create fetch request with auth
  const fetchFromYouTube = async (endpoint: string, params: Record<string, any>) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','));
        } else if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
      
      const response = await fetch(`${baseUrl}/${endpoint}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching from YouTube API (${endpoint}):`, error);
      throw error;
    }
  };
  
  return {
    // Channels API
    getChannels: async (params: Record<string, any>): Promise<YouTubeChannelResponse> => {
      return await fetchFromYouTube('channels', params);
    },
    
    // Playlists API
    getPlaylists: async (params: Record<string, any>): Promise<YouTubePlaylistResponse> => {
      return await fetchFromYouTube('playlists', params);
    },
    
    // Playlist items API
    getPlaylistItems: async (params: Record<string, any>) => {
      return await fetchFromYouTube('playlistItems', params);
    },
    
    // Videos API
    getVideos: async (params: Record<string, any>): Promise<YouTubeVideoResponse> => {
      return await fetchFromYouTube('videos', params);
    }
  };
};

// Get user's YouTube channels
export const getUserChannels = async (accessToken: string) => {
  try {
    const youtube = createYouTubeClient(accessToken);
    const response = await youtube.getChannels({
      part: 'snippet,contentDetails',
      mine: true
    });
    return response.items || [];
  } catch (error) {
    console.error('Error fetching user channels:', error);
    throw error;
  }
};

// Get user's playlists
export const getUserPlaylists = async (accessToken: string) => {
  try {
    const youtube = createYouTubeClient(accessToken);
    const response = await youtube.getPlaylists({
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50
    });
    return response.items || [];
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    throw error;
  }
};

// Find playlists containing a specific video
export const findPlaylistsWithVideo = async (accessToken: string, videoId: string) => {
  try {
    const youtube = createYouTubeClient(accessToken);
    const userPlaylists = await getUserPlaylists(accessToken);
    const playlistsWithVideo = [];

    for (const playlist of userPlaylists) {
      const playlistId = playlist.id;
      if (!playlistId) continue;

      const response = await youtube.getPlaylistItems({
        part: 'snippet',
        playlistId,
        videoId
      });

      if (response.items && response.items.length > 0) {
        playlistsWithVideo.push({
          ...playlist,
          addedAt: response.items[0].snippet?.publishedAt
        });
      }
    }

    return playlistsWithVideo;
  } catch (error) {
    console.error('Error finding playlists with video:', error);
    throw error;
  }
};

// Get video details
export const getVideoDetails = async (accessToken: string, videoId: string) => {
  try {
    const youtube = createYouTubeClient(accessToken);
    const response = await youtube.getVideos({
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });
    return response.items?.[0];
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
}; 