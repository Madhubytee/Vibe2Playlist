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
  //First try exact search
  let query = `track:${title} artist:${artist}`;

  let response = await fetch(
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

  let data = await response.json();
  let track = data.tracks?.items?.[0];

  //If no results and title contains remix/mix/edit, try searching for original
  if (!track && /\((remix|mix|edit|version|vip|bootleg)\)/i.test(title)) {
    console.log('Remix not found, searching for original song');

    //Removethe remix/mix/edit variations from title
    const originalTitle = title
      .replace(/\s*[\(\[].*?(remix|mix|edit|version|vip|bootleg).*?[\)\]]\s*/gi, '')
      .trim();

    query = `track:${originalTitle} artist:${artist}`;

    response = await fetch(
      `https://api.spotify.com/v1/search?` + new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1'
      }),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      } );

    if (response.ok) {
      data = await response.json();
      track = data.tracks?.items?.[0];

      if (track) {
        console.log(`Found original: ${track.name} by ${track.artists.map(a => a.name).join(', ')}`);
      }
    }
  }
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

export function detectVibeFromGenres(genres, trackTitle = '', artistName = '') {
  if (!genres || genres.length === 0) {
    return {
      name: 'Similar Tracks',
      params: {},
      targetGenres: []
    };
  }

  const genreStr = genres.join(' ').toLowerCase();
  const titleLower = trackTitle.toLowerCase();
  const artistLower = artistName.toLowerCase();

  //Check for romantic keywords in title or known romantic artists
  const romanticKeywords= /(love|heart|marry|wedding|forever|always|you|kiss|hold|beautiful|perfect|amazing|wonderful)/;
  const romanticArtists = /(ed sheeran|john legend|bruno mars|adele|sam smith|lewis capaldi|shawn mendes|charlie puth)/;
  const hasRomanticTitle = romanticKeywords.test(titleLower);
  const isRomanticArtist= romanticArtists.test(artistLower);

  //Sad / Melancholic - Slow, emotional, reflective
  if (genreStr.match(/\b(sad|melanchol|blues|tearjerker|depressing|heartbreak|emotional|piano ballad)\b/)) {
    return {
      name: 'Sad / Melancholic',
      targetGenres: genres
    };
  }

  //Romantic - Dreamy, affectionate, emotional (check before Hype/Feel-Good)
  //Also check title/artist for romantic context when genre is just "pop"
  if (genreStr.match(/\b(love|romantic|ballad|r&b|soul|slow jam|sensual|intimate|wedding)\b/) ||
      (genreStr.includes('pop') && (hasRomanticTitle || isRomanticArtist))) {
    return {
      name: 'Romantic',
      targetGenres: genres
    };
  }

  // Hype /Energy type songs- Fast, powerful, adrenaline
  if (genreStr.match(/\b(edm|electronic|dance|house|techno|dubstep|trap|hip hop|rap|hype|party|workout|gym)\b/)) {
    return {
      name: 'Hype / Energy',
      targetGenres: genres
    };
  }

  //Aesthetic - Calm, pretty, curated
  if (genreStr.match(/\b(dream pop|shoegaze|chillwave|vaporwave|indie folk|soft|gentle|serene)\b/)) {
    return {
      name: 'Aesthetic',
      targetGenres: genres
    };
  }

  //Dark / Villain Arc - Cold, confident, intimidating
  if (genreStr.match(/\b(dark|goth|industrial|metal|darkwave|witch house|phonk|villain|aggressive)\b/)) {
    return {
      name: 'Dark / Villain Arc',
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

//Use ChatGPT to generate intelligent song recommendations
// Spotify deprecated Related Artists, Recommendations, and Audio Features APIs on Nov 27, 2024 :( so instead i decided to use ACRCloud instead 
async function getAIRecommendations(trackName, artistName, genres, vibe, editDescription) {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  //detailed prompt that includes edit context
  let contextSection = '';
  if (editDescription && editDescription.trim().length > 0) {
    contextSection = `\nVideo Edit Context: ${editDescription.trim()}

IMPORTANT: Analyze this edit description carefully:
- If it mentions celebrities/artists (e.g., "Weeknd edit", "Sabrina Carpenter aesthetic"), this describes the VISUAL style/aesthetic of the edit, NOT the music to recommend. Match the detected song's style first, then consider the visual aesthetic.
- If it mentions content type (e.g., "Minecraft", "anime", "gym workout"), tailor the energy/mood to that use case while maintaining the detected song's genre
- If it mentions specific moods (e.g., "sad", "hype", "badass"), adjust the energy level but keep the detected song's core style
- The detected song is the PRIMARY guide - the edit description is SECONDARY context for fine-tuning

`;
  }

  const prompt = `You are a music expert and video editor who understands internet culture, TikTok/Instagram edit trends, and how music matches visual content.

Song Detected: "${trackName}" by ${artistName}
Genres: ${genres.join(', ') || 'Unknown'}
Detected Vibe: ${vibe}${contextSection}
CRITICAL RULE: The recommendations must match BOTH the detected song's style/genre/vibe AND the visual content (if provided).

For example:
- If the song is "Perfect" by Ed Sheeran (romantic pop) + edit is "people from movies in love" → Romantic pop ballads that fit love scenes
- If the song is Taylor Swift (pop) + edit is "Minecraft montage" → You CANNOT suggest C418 gaming music. Instead suggest upbeat/energetic pop songs similar to Taylor Swift that work for gaming montages
- If the song is aggressive rap + edit is "gym workout" → Perfect match, suggest similar aggressive rap/hip-hop
- If the song is sad piano + edit is "Sabrina Carpenter aesthetic" → Find the overlap: sad/aesthetic pop songs similar to both

Based on ALL the information above, suggest exactly 19 songs that:

1. **MUST be musically similar** to the detected song (genre, tempo, style, artist)
2. **MUST also fit** the edit's visual theme/mood (if provided)
3. Find the INTERSECTION between audio style and visual content - both must match
4. Include a variety of artists (maximum 2 songs from any single artist)
5. Are popular/recognizable enough to be found on Spotify
6. Would actually be used in this type of edit on TikTok/Instagram

Examples showing the INTERSECTION approach:
- Song: "Perfect" (Ed Sheeran, romantic pop) + Edit: "movie couples in love" → Other romantic pop ballads (John Legend, Adele, Christina Perri)
- Song: "Levitating" (Dua Lipa, upbeat pop) + Edit: "Minecraft" → Upbeat electronic pop (similar energy but different content type, find the overlap)
- Song: "The Nights" (Avicii, EDM) + Edit: "sad anime" → This is a mismatch - prioritize the EDM style but pick more emotional EDM tracks
- Song: "Lovely" (Billie Eilish, sad) + Edit: "Sabrina Carpenter aesthetic" → Sad aesthetic pop (Gracie Abrams, Olivia Rodrigo sad songs)

Respond ONLY with a JSON array in this exact format:
[
  {"title": "Song Title", "artist": "Artist Name"},
  {"title": "Song Title 2", "artist": "Artist Name 2"},
  ...
]

Do not include any explanations, markdown formatting, or code blocks - JUST the raw JSON array.`;

  console.log('Asking ChatGPT for recommendations...');
  if (editDescription) {
    console.log('With edit context:', editDescription);
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  });

  const response = completion.choices[0].message.content.trim();
  console.log('ChatGPT response received');

  //Remove markdown code blocks if ChatGPT added them
  let cleanResponse = response;
  if (response.startsWith('```')) {
    cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  //Parses the JSON response
  const suggestions = JSON.parse(cleanResponse);
  return suggestions;
}

//Gets recommendations using AI + Spotify Search
export async function getRecommendations(trackId, accessToken, vibe, editDescription, limit = 19) {
  const tracks = [];

  //Get the original track details
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

  console.log(`Getting AI recommendations for: ${track.name} by ${track.artists[0].name}`);

  //Get artist details to access genres
  const artistResponse = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!artistResponse.ok) {
    throw new Error(`Failed to get artist: ${artistResponse.status}`);
  }

  const artist = await artistResponse.json();
  const genres = artist.genres || [];
  console.log(`Artist genres: ${genres.join(', ')}`);

  //Get AI suggestions
  let suggestions = [];
  try {
    console.log('Calling OpenAI API...');
    suggestions = await getAIRecommendations(
      track.name,
      track.artists[0].name,
      genres,
      vibe?.name || 'Similar Tracks',
      editDescription
    );
    console.log(`ChatGPT suggested ${suggestions.length} songs`);
  } catch (error) {
    console.error('ERROR getting AI recommendations:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.error('Stack:', error.stack);
    //Fallback: just use tracks from the same artist if AI fails
    suggestions = [];
  }

  //Search for each suggested song on Spotify
  for (const suggestion of suggestions) {
    if (tracks.length >= limit) break;

    try {
      const query = `track:${suggestion.title} artist:${suggestion.artist}`;
      console.log(`Searching for: ${suggestion.title} by ${suggestion.artist}`);

      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?${new URLSearchParams({
          q: query,
          type: 'track',
          limit: '1',
          market: 'US'
        })}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const foundTrack = searchData.tracks?.items?.[0];

        if (foundTrack && foundTrack.id !== trackId && !tracks.some(t => t.id === foundTrack.id)) {
          tracks.push({
            id: foundTrack.id,
            uri: foundTrack.uri,
            name: foundTrack.name,
            artists: foundTrack.artists.map(a => a.name).join(', '),
            albumArt: foundTrack.album?.images?.[0]?.url || null,
          });
          console.log(`  ✓ Found: ${foundTrack.name}`);
        } else {
          console.log(`  ✗ Not found or duplicate`);
        }
      }
    } catch (error) {
      console.error(`Error searching for ${suggestion.title}:`, error.message);
    }
  }

  console.log(`Total AI-recommended tracks found: ${tracks.length}`);

  //If we still need more tracks, fill with tracks from the original artist
  if (tracks.length < limit) {
    console.log(`Need ${limit - tracks.length} more tracks, adding from original artist`);

    const topTracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (topTracksResponse.ok) {
      const topTracksData = await topTracksResponse.json();
      const artistTracks = topTracksData.tracks
        .filter(t =>
          t.id !== trackId &&
          !tracks.some(existing => existing.id === t.id)
        )
        .slice(0, limit - tracks.length)
        .map(t => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artists: t.artists.map(a => a.name).join(', '),
        }));

      console.log(`  Added ${artistTracks.length} tracks from original artist`);
      tracks.push(...artistTracks);
    }
  }

  console.log(`Final track count: ${tracks.length}`);

  return tracks.slice(0, limit);
}
