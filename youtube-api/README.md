# YouTube Playlist Analyzer

A web application to analyze YouTube playlists and track video performance across playlists.

## Features

- **Google OAuth Login**: Securely authenticate with your Google account
- **YouTube Integration**: Access your YouTube channels, videos, and playlists
- **Video Search**: Find which playlists contain specific videos
- **Analytics**: Track video views and performance
- **Export**: Download data in JSON or CSV format

## Tech Stack

- React with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Supabase for authentication and database
- YouTube Data API v3

## Prerequisites

1. Node.js (v14 or higher)
2. A Supabase account (free tier available)
3. Google Developer API access
4. YouTube Data API v3 enabled

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd youtube-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Enable Google OAuth Provider:
   - Go to Authentication > Providers > Google
   - Enable Google authentication
   - Set up your Google OAuth credentials (see next section)
   - Add the redirect URL (typically `https://your-supabase-url.supabase.co/auth/v1/callback`)

### 4. Set up Google OAuth and YouTube API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Configure OAuth consent screen
5. Create OAuth credentials
   - Set authorized redirect URI to your Supabase URL
   - Add necessary YouTube API scopes:
     - `https://www.googleapis.com/auth/youtube.readonly`

### 5. Configure environment variables

Create a `.env.local` file in the root directory:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Run the development server

```bash
npm run dev
```

## Deployment

The app can be deployed to Vercel or any similar platform:

1. Connect your repository to Vercel
2. Configure the environment variables
3. Deploy

## License

MIT
