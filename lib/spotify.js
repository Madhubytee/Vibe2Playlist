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
    genres: music.genres?.map(g => g.name) || [],
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

export function detectVibeFromGenres(genres) {
  if (!genres || genres.length === 0) {
    return {
      name: 'Similar Tracks',
      params: {},
      targetGenres: []
    };
  }

  const genreStr = genres.join(' ').toLowerCase();

  // Sad / Melancholic - Slow, emotional, reflective
  if (genreStr.match(/\b(sad|melanchol|blues|tearjerker|depressing|heartbreak|emotional|piano ballad)\b/)) {
    return {
      name: 'Sad / Melancholic',
      targetGenres: genres
    };
  }

  // Hype / Energy - Fast, powerful, adrenaline
  if (genreStr.match(/\b(edm|electronic|dance|house|techno|dubstep|trap|hip hop|rap|hype|party|workout|gym)\b/)) {
    return {
      name: 'Hype / Energy',
      targetGenres: genres
    };
  }

  // Aesthetic - Calm, pretty, curated
  if (genreStr.match(/\b(dream pop|shoegaze|chillwave|vaporwave|indie folk|soft|gentle|serene)\b/)) {
    return {
      name: 'Aesthetic',
      targetGenres: genres
    };
  }

  // Dark / Villain Arc - Cold, confident, intimidating
  if (genreStr.match(/\b(dark|goth|industrial|metal|darkwave|witch house|phonk|villain|aggressive)\b/)) {
    return {
      name: 'Dark / Villain Arc',
      targetGenres: genres
    };
  }

  // Romantic - Dreamy, affectionate, emotional
  if (genreStr.match(/\b(love|romantic|ballad|r&b|soul|slow jam|sensual|intimate)\b/)) {
    return {
      name: 'Romantic',
      targetGenres: genres
    };
  }

  // Nostalgic - Memories, childhood, "missing the past"
  if (genreStr.match(/\b(nostalgia|retro|80s|90s|oldies|classic|throwback|vintage)\b/)) {
    return {
      name: 'Nostalgic',
      targetGenres: genres
    };
  }

  // Angsty - Frustrated, raw, misunderstood
  if (genreStr.match(/\b(emo|punk|grunge|alt rock|alternative|screamo|post-hardcore|angst)\b/)) {
    return {
      name: 'Angsty',
      targetGenres: genres
    };
  }

  // Funny / Crack Edit - Chaotic, unserious, playful
  if (genreStr.match(/\b(comedy|meme|parody|novelty|funny|joke|silly)\b/)) {
    return {
      name: 'Funny / Crack Edit',
      targetGenres: genres
    };
  }

  // Cinematic - Epic, serious, storytelling
  if (genreStr.match(/\b(cinematic|soundtrack|orchestral|epic|dramatic|film score|trailer)\b/)) {
    return {
      name: 'Cinematic',
      targetGenres: genres
    };
  }

  // Dreamcore / Surreal - Unreal, floaty, unsettling
  if (genreStr.match(/\b(ambient|drone|experimental|psychedelic|surreal|ethereal|dreamy|trippy)\b/)) {
    return {
      name: 'Dreamcore / Surreal',
      targetGenres: genres
    };
  }

  // Feel-good (keeping as fallback for pop/funk/disco)
  if (genreStr.match(/\b(pop|funk|disco|upbeat|happy|cheerful|feel.?good)\b/)) {
    return {
      name: 'Feel-Good',
      targetGenres: genres
    };
  }

  // Chill (keeping as fallback for acoustic/jazz)
  if (genreStr.match(/\b(acoustic|folk|jazz|lofi|lo.?fi|chill|calm|peaceful|relaxing)\b/)) {
    return {
      name: 'Chill',
      targetGenres: genres
    };
  }

  // Default to genre-based recommendations
  return {
    name: genres[0] || 'Similar Tracks',
    targetGenres: genres
  };
}

// Get recommendations using artist's top tracks + related artists' top tracks
export async function getRecommendations(trackId, accessToken, limit = 19) {
  const tracks = [];

  // Get the original track to find the artist
  const trackResponse = await fetch(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!trackResponse.ok) {
    throw new Error(`Failed to get track: ${trackResponse.status}`);
  }

  const track = await trackResponse.json();
  const artistId = track.artists[0]?.id;

  if (!artistId) {
    throw new Error('No artist found for track');
  }

  // Get artist's top tracks
  const topTracksResponse = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (topTracksResponse.ok) {
    const topTracksData = await topTracksResponse.json();
    const artistTracks = topTracksData.tracks
      .filter(t => t.id !== trackId) // Exclude the seed track
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artists: t.artists.map(a => a.name).join(', '),
      }));
    tracks.push(...artistTracks);
  }

  // Get related artists
  const relatedResponse = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (relatedResponse.ok && tracks.length < limit) {
    const relatedData = await relatedResponse.json();
    const relatedArtists = relatedData.artists.slice(0, 3); // Get top 3 related artists

    // Get top tracks from each related artist
    for (const artist of relatedArtists) {
      if (tracks.length >= limit) break;

      const artistTopResponse = await fetch(
        `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (artistTopResponse.ok) {
        const artistTopData = await artistTopResponse.json();
        const relatedTracks = artistTopData.tracks
          .slice(0, 3)
          .map(t => ({
            id: t.id,
            uri: t.uri,
            name: t.name,
            artists: t.artists.map(a => a.name).join(', '),
          }));
        tracks.push(...relatedTracks);
      }
    }
  }

  return tracks.slice(0, limit);
}
