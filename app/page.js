'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [playlistStatus, setPlaylistStatus] = useState('idle');
  const [playlist, setPlaylist] = useState(null);
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');

    if (accessToken) {
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_refresh_token', refreshToken);
      localStorage.setItem('spotify_token_expiry', Date.now() + expiresIn * 1000);
      setSpotifyToken(accessToken);

      window.history.replaceState({}, document.title, '/');
    } else {
      const savedToken = localStorage.getItem('spotify_access_token');
      const expiry = localStorage.getItem('spotify_token_expiry');

      if (savedToken && expiry && Date.now() < expiry) {
        setSpotifyToken(savedToken);
      }
    }
  }, []);

  const handleSpotifyLogin = async () => {
    const response = await fetch('/api/auth/login');
    const data = await response.json();

    if (data.authUrl) {
      window.location.href = data.authUrl;
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setStatus('idle');
    setResult(null);
    setPlaylist(null);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!file) 
      return;
    setStatus('recognizing');
    setResult(null);

    const formData =new FormData();
    formData.append('video', file);

    const headers = {};
    if (spotifyToken) {
      headers['x-spotify-token'] = spotifyToken;
    }

    try {
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setResult(data);
      } 
      else {
        setStatus('error');
        setResult({ error: data.error || 'Unknown error' });
      }
    } 
    catch (error) {
      setStatus('error');
      setResult({ error: error.message });
    }
  };

  const handleCreatePlaylist = async () => {
    if (!result?.spotifyTrack || !spotifyToken) return;

    setPlaylistStatus('creating');

    try {
      const response = await fetch('/api/playlist/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-spotify-token': spotifyToken,
        },
        body: JSON.stringify({
          trackUri: result.spotifyTrack.uri,
          trackName: result.spotifyTrack.name,
          artistName: result.spotifyTrack.artists,
          trackId: result.spotifyTrack.id,
          vibe: result.vibe,
          editDescription: editDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPlaylistStatus('success');
        setPlaylist(data.playlist);
      } else {
        setPlaylistStatus('error');
      }
    } catch (error) {
      setPlaylistStatus('error');
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px' }}>
      <h1>Vibe2Playlist</h1>
      <p>Turn a video clip into a Spotify playlist!</p>

      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        {spotifyToken ? (
          <div style={{ padding: '0.5rem', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
            ✓ Connected to Spotify
          </div>
        ) : (
          <button
            onClick={handleSpotifyLogin}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1DB954',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Connect Spotify
          </button>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          style={{ display: 'block', marginBottom: '1rem' }}
        />

        <button
          onClick={handleUpload}
          disabled={!file || status === 'recognizing'}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: file && status !== 'recognizing' ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file && status !== 'recognizing' ? 'pointer' : 'not-allowed',
          }}
        >
          {status === 'recognizing' ? 'Recognizing...' : 'Upload'}
        </button>
      </div>

      {videoUrl && status === 'success' && (
        <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
          <div style={{ flex: '1' }}>
            <h3>Your Edit</h3>
            <video
              src={videoUrl}
              controls
              style={{
                width: '100%',
                maxWidth: '500px',
                borderRadius: '8px',
                backgroundColor: '#000',
              }}
            />
          </div>

          <div style={{ flex: '1' }}>
            {result?.song && (
              <div>
                <h3>Detected Song</h3>
                <p><strong>{result.song.title}</strong></p>
                <p>by {result.song.artists}</p>
                {result.song.album && <p>Album: {result.song.album}</p>}

                {result.vibe && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    borderLeft: '4px solid #1DB954',
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                      This edit feels:
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {result.vibe.name}
                    </p>
                  </div>
                )}

                {result.spotifyTrack && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="editDescription" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.95rem' }}>
                        Describe your edit (optional):
                      </label>
                      <textarea
                        id="editDescription"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="e.g., 'Minecraft gameplay montage', 'Sabrina Carpenter aesthetic edit', 'sad anime edit about loss', 'gym motivation workout', etc."
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem',
                          resize: 'vertical',
                        }}
                      />
                      <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0 0' }}>
                        Help AI find better matches by describing your video's content, celebrities featured, or the mood/theme
                      </p>
                    </div>
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={playlistStatus === 'creating'}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: playlistStatus === 'creating' ? '#ccc' : '#1DB954',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: playlistStatus === 'creating' ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                      }}
                    >
                      {playlistStatus === 'creating' ? 'Creating Playlist...' : 'Create Playlist'}
                    </button>

                    {playlist && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: '#1DB954',
                        borderRadius: '4px',
                      }}>
                        <h4 style={{ margin: 0, color: 'white' }}>✓ Playlist Created!</h4>
                        <p style={{ color: 'white', margin: '0.5rem 0' }}>
                          {playlist.name}
                          {playlist.trackCount && <span> • {playlist.trackCount} tracks</span>}
                        </p>
                        <a
                          href={playlist.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'white',
                            textDecoration: 'underline',
                            fontWeight: 'bold',
                          }}
                        >
                          Open in Spotify →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {status !== 'idle' && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}>
          <h3>Results:</h3>
          {status === 'recognizing' && <p>Recognizing...</p>}
          {status === 'success' && result?.song && (
            <div>
              <h4 style={{ marginTop: 0 }}>Detected Song:</h4>
              <p><strong>{result.song.title}</strong> by {result.song.artists}</p>
              {result.song.album && <p>Album: {result.song.album}</p>}

              {result.spotifyTrack ? (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#1DB954', borderRadius: '4px' }}>
                  <h4 style={{ margin: 0, color: 'white' }}>Found on Spotify:</h4>
                  <p style={{ color: 'white', margin: '0.5rem 0' }}>
                    <strong>{result.spotifyTrack.name}</strong> by {result.spotifyTrack.artists}
                  </p>
                  <a
                    href={result.spotifyTrack.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'white', textDecoration: 'underline' }}
                  >
                    Open in Spotify
                  </a>
                </div>
              ) : (
                <p style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '0.5rem', borderRadius: '4px' }}>
                  Song detected but not found on Spotify
                </p>
              )}

              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer' }}>Show raw data</summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
          {status === 'error' && (
            <p style={{ color: 'red' }}>Error: {result?.error}</p>
          )}
        </div>
      )}
    </main>
  );
}