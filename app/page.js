'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Upload, X, Music2, CheckCircle2, User, AudioLines, Brain, ListMusic, Search, Check, Loader2, ExternalLink, Play, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Home() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [playlistStatus, setPlaylistStatus] = useState('idle');
  const [playlist, setPlaylist] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stars, setStars] = useState([]);

  //App states are: 'idle', 'processing', 'complete'
  const appState = status === 'idle' ? 'idle' : status === 'success' && result?.song ? 'complete' : status === 'recognizing' ? 'processing' : 'idle';
  useEffect(() => {
    const generatedStars = Array.from({ length: 150 }, (_, i) => {
      const size = Math.random() > 0.7 ? 'star-large' : Math.random() > 0.4 ? 'star-medium' : 'star-small';
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const duration = 2 + Math.random() * 3;
      const delay = Math.random() * 5;

      return {
        id: i,
        size,
        top,
        left,
        duration,
        delay,
      };
    });
    setStars(generatedStars);
  }, []);

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

  //Processing steps animation
  useEffect(() => {
    if (status === 'recognizing' && currentStep < 4) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (status === 'idle') {
      setCurrentStep(0);
    }
  }, [status, currentStep]);

  const handleSpotifyLogin = async () => {
    const response = await fetch('/api/auth/login');
    const data = await response.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
    }
  };

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
    setStatus('idle');
    setResult(null);
    setPlaylist(null);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
    } else {
      setVideoUrl(null);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type.startsWith('video/')) {
        handleFileChange(droppedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('recognizing');
    setResult(null);
    setCurrentStep(0);
    setPlaylistStatus('idle');

    const formData = new FormData();
    formData.append('video', file);

    const headers = {};
    if (spotifyToken) {
      headers['x-spotify-token'] = spotifyToken;
    }

    try {
      //Step 1: Identify the song
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setResult(data);

        //Step 2: Automatically create playlist
        if (data.spotifyTrack && spotifyToken) {
          setCurrentStep(3); // Move to "Creating playlist" step
          setPlaylistStatus('creating');

          try {
            const playlistResponse = await fetch('/api/playlist/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-spotify-token': spotifyToken,
              },
              body: JSON.stringify({
                trackUri: data.spotifyTrack.uri,
                trackName: data.spotifyTrack.name,
                artistName: data.spotifyTrack.artists,
                trackId: data.spotifyTrack.id,
                vibe: data.vibe,
                editDescription: editDescription,
              }),
            });

            const playlistData = await playlistResponse.json();

            if (playlistResponse.ok) {
              setPlaylistStatus('success');
              setPlaylist(playlistData.playlist);
              setStatus('success');
            } else {
              setPlaylistStatus('error');
              setStatus('success'); // Still show the detected song
            }
          } catch (playlistError) {
            setPlaylistStatus('error');
            setStatus('success'); // Still show the detected song
          }
        } else {
          setStatus('success');
        }
      } else {
        setStatus('error');
        setResult({ error: data.error || 'Unknown error' });
      }
    } catch (error) {
      setStatus('error');
      setResult({ error: error.message });
    }
  };

  const handleReset = () => {
    setFile(null);
    setVideoUrl(null);
    setEditDescription('');
    setStatus('idle');
    setResult(null);
    setPlaylist(null);
    setCurrentStep(0);
    setPlaylistStatus('idle');
  };

  const canSubmit = file && editDescription.trim() && spotifyToken;

  const steps = [
    { id: 'extract', label: 'Extracting audio', icon: AudioLines },
    { id: 'recognize', label: 'Recognizing song', icon: Search },
    { id: 'analyze', label: 'Analyzing vibe', icon: Brain },
    { id: 'create', label: 'Creating playlist', icon: ListMusic },
  ];

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <div className="stars">
        {stars.map((star) => (
          <div
            key={star.id}
            className={`star ${star.size}`}
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              '--duration': `${star.duration}s`,
              '--delay': `${star.delay}s`,
            }}
          />
        ))}
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          {appState === 'idle' && (
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold text-gradient music-title mb-4">
                Vibe2Playlist
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                Upload your edit and let AI create a Spotify playlist that matches the vibe perfectly.
              </p>
            </div>
          )}

          {appState === 'idle' && (
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="glass-card rounded-2xl p-6 space-y-6">
                <div className="w-full">
                  {!spotifyToken ? (
                    <Button
                      onClick={handleSpotifyLogin}
                      className="w-full h-14 bg-spotify hover:bg-spotify/90 text-primary-foreground font-semibold text-base rounded-xl transition-all duration-300 spotify-glow"
                    >
                      <Music2 className="w-5 h-5 mr-2" />
                      Connect to Spotify
                    </Button>
                  ) : (
                    <div className="glass-card rounded-xl p-4 animate-scale-in border border-spotify/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-spotify/20 flex items-center justify-center ring-2 ring-spotify/40">
                          <Music2 className="w-6 h-6 text-spotify" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-spotify">Connected to Spotify</p>
                            <CheckCircle2 className="w-4 h-4 text-spotify" />
                          </div>
                          <p className="text-sm text-muted-foreground">Ready to create playlists</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-spotify animate-pulse shadow-[0_0_8px_rgba(29,185,84,0.6)]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Upload */}
                <div className="w-full">
                  {!file ? (
                    <div
                      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer group",
                        isDragging
                          ? "border-primary bg-primary/10 scale-[1.02]"
                          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20"
                      )}
                    >
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            handleFileChange(files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className={cn(
                          "p-4 rounded-full transition-all duration-300",
                          isDragging ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"
                        )}>
                          <Upload className={cn(
                            "w-8 h-8 transition-colors",
                            isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                          )} />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-foreground">
                            {isDragging ? "Drop your video here" : "Drag & drop your video"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse • MP4, MOV, AVI supported
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden animate-scale-in">
                      <video
                        src={videoUrl || undefined}
                        controls
                        className="w-full max-h-64 object-contain bg-black rounded-xl"
                      />
                      <button
                        onClick={() => handleFileChange(null)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                      >
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description Input */}
                <div className="w-full space-y-3">
                  <label className="text-sm font-medium text-foreground">Describe Your Edit</label>
                  <div className="relative rounded-xl">
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      maxLength={500}
                      placeholder="What vibe does your video edit have? e.g., romantic couples dancing, gaming montage, celeb edit..."
                      className="w-full h-32 px-4 py-3 bg-input border border-border rounded-xl resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                      {editDescription.length}/500
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!canSubmit}
                className={cn(
                  "w-full h-14 font-semibold text-base rounded-xl transition-all duration-300",
                  canSubmit
                    ? "bg-gradient-to-r from-primary via-primary to-spotify hover:opacity-90 animate-pulse-glow"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <ListMusic className="w-5 h-5 mr-2" />
                Create My Playlist
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {appState === 'processing' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-spotify/20 to-primary/20 mb-4 animate-pulse">
                  <Loader2 className="w-12 h-12 text-spotify animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Creating Your Playlist</h2>
                <p className="text-muted-foreground">This usually takes 15-25 seconds</p>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">Progress</span>
                    <span className="font-semibold text-spotify">{Math.round((currentStep / steps.length) * 100)}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-spotify transition-all duration-500 ease-out"
                      style={{ width: `${(currentStep / steps.length) * 100}%` }}
                    />
                  </div>

                  <div className="space-y-3 mt-6">
                    {steps.map((step, index) => {
                      const isActive = index === currentStep;
                      const isDone = index < currentStep;
                      const Icon = step.icon;

                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl transition-all duration-500",
                            isActive ? "glass-card scale-[1.02] border border-spotify/30" : isDone ? "opacity-100" : "opacity-40"
                          )}
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                              isDone
                                ? "bg-spotify text-white shadow-[0_0_12px_rgba(29,185,84,0.4)]"
                                : isActive
                                ? "bg-spotify/20 text-spotify ring-2 ring-spotify/40"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isDone ? (
                              <Check className="w-5 h-5" />
                            ) : isActive ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                        <span
                          className={cn(
                            "font-medium",
                            isDone || isActive ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </span>
                        {isActive && (
                          <div className="ml-auto flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Results State */}
          {appState === 'complete' && result?.song && (
            <div className="space-y-6">
              <div className="w-full space-y-6 animate-fade-in">
                {/* Detected Song */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Detected Song</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <img
                        src={result.song.albumArt || 'https://via.placeholder.com/80'}
                        alt={result.song.title}
                        className="w-20 h-20 rounded-xl object-cover shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-foreground">{result.song.title}</p>
                      <p className="text-muted-foreground">{result.song.artists}</p>
                    </div>
                    {result.vibe && (
                      <div className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-spotify text-white font-medium text-sm shadow-lg">
                        {result.vibe.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Creating Playlist Status */}
                {result.spotifyTrack && !playlist && playlistStatus === 'creating' && (
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-center gap-3 py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-spotify" />
                      <p className="text-lg font-semibold text-foreground">Creating your playlist...</p>
                    </div>
                  </div>
                )}

                {/* Playlist Preview which shows the tracks*/}
                {playlist && playlist.tracks && (
                  <div className="glass-card rounded-2xl p-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Your Playlist ({playlist.trackCount} tracks)</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-2 mb-4">
                      {playlist.tracks.map((track, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                          {track.albumArt ? (
                            <img
                              src={track.albumArt}
                              alt={track.name}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{track.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.artists}</p>
                          </div>
                          <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => window.open(playlist.url, '_blank')}
                      className="w-full h-14 bg-spotify hover:bg-spotify/90 text-primary-foreground font-semibold text-base rounded-xl transition-all duration-300 spotify-glow"
                    >
                      <Disc3 className="w-5 h-5 mr-2 animate-spin" style={{ animationDuration: '3s' }} />
                      Open Playlist in Spotify
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full h-12 rounded-xl border-border text-foreground hover:bg-muted"
              >
                Create Another Playlist
              </Button>
            </div>
          )}

          {/* Error State*/}
          {status === 'error' && (
            <div className="glass-card rounded-2xl p-6 bg-destructive/10 border-destructive/50 animate-fade-in">
              <p className="text-destructive font-semibold">
                Error: {result?.error || 'Something went wrong'}
              </p>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
