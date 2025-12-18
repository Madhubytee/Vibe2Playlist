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
