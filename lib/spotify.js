export function parseACRCloudResult(acrResult) {
  if (acrResult.status?.code !== 0) {
    return null;
  }

  const music = acrResult.metadata?.music?.[0];
  if (!music) {
    return null;
  }

  return {
    title: music.title,
    artists: music.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
    album: music.album?.name || '',
  };
}

export async function searchSpotifyTrack(title, artist, accessToken) {
  const query = `track:${title} artist:${artist}`;

  const response = await fetch(
    `https://api.spotify.com/v1/search?` + new URLSearchParams({
      q: query,
      type: 'track',
      limit: '1'
    }),
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Spotify search failed: ${response.status}`);
  }

  const data = await response.json();
  const track = data.tracks?.items?.[0];

  if (!track) {
    return null;
  }

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    url: track.external_urls.spotify,
  };
}

export async function getAudioFeatures(trackId, accessToken) {
  const response = await fetch(
    `https://api.spotify.com/v1/audio-features/${trackId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get audio features: ${response.status}`);
  }

  return await response.json();
}

export function detectVibe(audioFeatures) {
  const { energy, valence, tempo, danceability, acousticness } = audioFeatures;

  //Hype: High energy + fast tempo
  if (energy > 0.7 && tempo > 120) {
    return {
      name: 'Hype',
      params: {
        min_energy: 0.7,
        min_tempo: 120,
      }
    };
  }

  //Sad/Mellow: Low energy + low valence
  if (energy < 0.4 && valence < 0.4) {
    return {
      name: 'Sad/Mellow',
      params: {
        max_energy: 0.5,
        max_valence: 0.4,
      }
    };
  }

  //Feel-Good: High valence + high danceability
  if (valence > 0.6 && danceability > 0.6) {
    return {
      name: 'Feel-Good',
      params: {
        min_valence: 0.6,
        min_danceability: 0.6,
      }
    };
  }

  //Chill vid: High acousticness OR (low energy + moderate valence)
  if (acousticness > 0.6 || (energy < 0.4 && valence > 0.4 && valence < 0.7)) {
    return {
      name: 'Chill',
      params: {
        max_energy: 0.5,
        max_tempo: 110,
      }
    };
  }

  //Neutral: Everything elsem, something fairly balanced
  return {
    name: 'Balanced',
    params: {}
  };
}

export async function getRecommendations(trackId, vibe, accessToken, limit = 19) {
  const params = new URLSearchParams({
    seed_tracks: trackId,
    limit: limit.toString(),
    ...vibe.params,
  });

  const response = await fetch(
    `https://api.spotify.com/v1/recommendations?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get recommendations: ${response.status}`);
  }

  const data = await response.json();
  return data.tracks.map(track => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map(a => a.name).join(', '),
  }));
}
