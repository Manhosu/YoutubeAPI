import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getUserChannels, getUserPlaylists } from '../lib/youtube';

interface Channel {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
    };
  };
}

interface Playlist {
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
}

const Dashboard = () => {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const fetchYouTubeData = async () => {
      if (!session?.provider_token) return;
      
      setIsDataLoading(true);
      setError(null);
      
      try {
        // Get the OAuth access token from Supabase session
        const accessToken = session.provider_token;
        
        // Fetch channels
        const channelsData = await getUserChannels(accessToken);
        setChannels(channelsData);
        
        // Fetch playlists
        const playlistsData = await getUserPlaylists(accessToken);
        setPlaylists(playlistsData);
      } catch (err: any) {
        console.error('Error fetching YouTube data:', err);
        setError(err.message || 'Failed to fetch YouTube data');
      } finally {
        setIsDataLoading(false);
      }
    };

    if (session?.provider_token) {
      fetchYouTubeData();
    }
  }, [session]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your YouTube Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {isDataLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl">Loading your YouTube data...</div>
          </div>
        ) : (
          <>
            {/* Channels Section */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-4">Your Channels</h2>
              
              {channels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {channels.map(channel => (
                    <div key={channel.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="p-4 flex items-center">
                        {channel.snippet?.thumbnails?.default?.url && (
                          <img 
                            src={channel.snippet.thumbnails.default.url}
                            alt={channel.snippet?.title}
                            className="w-16 h-16 rounded-full mr-4"
                          />
                        )}
                        <div>
                          <h3 className="font-bold text-lg">{channel.snippet?.title}</h3>
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {channel.snippet?.description || 'No description available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No channels found.</p>
              )}
            </section>
            
            {/* Playlists Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Playlists</h2>
              
              {playlists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map(playlist => (
                    <div key={playlist.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      {playlist.snippet?.thumbnails?.medium?.url && (
                        <img 
                          src={playlist.snippet.thumbnails.medium.url}
                          alt={playlist.snippet?.title}
                          className="w-full h-36 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-bold">{playlist.snippet?.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {playlist.contentDetails?.itemCount} videos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No playlists found.</p>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard; 