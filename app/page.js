'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [spotifyToken, setSpotifyToken] = useState(null);

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
    setFile(e.target.files[0]);
    setStatus('idle');
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) 
      return;
    setStatus('recognizing');
    setResult(null);

    const formData =new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/api/identify', {
        method: 'POST',
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

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '600px' }}>
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

      {status !== 'idle' && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}>
          <h3>Results:</h3>
          {status === 'recognizing' && <p>Recognizing...</p>}
          {status === 'success' && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
          {status === 'error' && (
            <p style={{ color: 'red' }}>Error: {result?.error}</p>
          )}
        </div>
      )}
    </main>
  );
}