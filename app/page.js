'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

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