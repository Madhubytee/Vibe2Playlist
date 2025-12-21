import { NextResponse } from 'next/server';
import { getRecommendations } from '../../../../lib/spotify.js';

export async function POST(request) {
  try {
    const spotifyToken = request.headers.get('x-spotify-token');

    if (!spotifyToken) {
      return NextResponse.json(
        { error: 'Spotify token required' },
        { status: 401 }
      );
    }
    const { trackUri, trackName, artistName, trackId } = await request.json();

    if (!trackUri || !trackName) {
      return NextResponse.json(
        { error: 'Track URI and name required' },
        { status: 400 }
      );
    }

    //Get user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${spotifyToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get user profile');
    }

    const profile = await profileResponse.json();

    //Create the spotify playlist
    const playlistName = `${trackName} Vibes`;
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${profile.id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          description: `A playlist inspired by ${trackName} by ${artistName}. Created with Vibe2Playlist.`,
          public: true,
        }),
      }
    );

    if (!createPlaylistResponse.ok) {
      const error = await createPlaylistResponse.json();
      console.error('Create playlist error:', error);
      throw new Error('Failed to create playlist');
    }

    const playlist = await createPlaylistResponse.json();

    //Get recommended tracks based on vibe
    let trackUris = [trackUri];

    if (trackId) {
      try {
        console.log('Requesting recommendations for track:', trackId);
        const recommendations = await getRecommendations(trackId, spotifyToken, 19);
        console.log(`Got ${recommendations.length} recommendations`);
        const recommendedUris = recommendations.map(track => track.uri);
        trackUris = [trackUri, ...recommendedUris];
        console.log(`Adding ${trackUris.length} tracks to playlist`);
      } catch (error) {
        console.error('Recommendations error:', error);
        console.error('Error message:', error.message);
        // Continue with just the original track if recommendations fail
      }
    } else {
      console.log('Skipping recommendations - no trackId');
    }

    //Add tracks to playlist
    const addTrackResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      }
    );

    if (!addTrackResponse.ok) {
      console.error('Add track error:', await addTrackResponse.json());
      throw new Error('Failed to add tracks to playlist');
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
        trackCount: trackUris.length,
      },
    });

  } catch (error) {
    console.error('Playlist creation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
