import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Spotify credentials not configured' },
      { status: 500 }
    );
  }

  const scopes = [
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private'
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    show_dialog: 'false',
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.json({ authUrl });
}
