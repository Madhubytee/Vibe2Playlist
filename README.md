# Vibe2Playlist

Turn edits into Spotify playlists! Upload a video, get a playlist that matches the vibe.

## What it does

- Extracts audio from your video
- Identifies the song using ACRCloud
- Detects the vibe (romantic, hype, chill, etc.)
- Uses AI to find 19 similar tracks
- Creates a Spotify playlist with 20 songs total

The AI considers both the music style AND your video's content - so if you're making a Minecraft montage with a Taylor Swift song, you'll get upbeat pop (not gaming music).

## Tech Stack

- **Next.js 16** - React framework
- **ACRCloud API** - Music recognition
- **Spotify Web API** - Playlist creation
- **OpenAI GPT-4o-mini** - Song recommendations
- **FFmpeg** - Audio extraction

## Setup

1. Clone the repo:
```bash
git clone https://github.com/Madhubytee/Vibe2Playlist.git
cd Vibe2Playlist
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Get your API keys:

**ACRCloud** (music recognition):
- Sign up at https://console.acrcloud.com/
- Create a project and copy your access key/secret

**Spotify** (playlists):
- Go to https://developer.spotify.com/dashboard
- Create an app
- Add redirect URI: `http://127.0.0.1:3000/api/auth/callback`
- Copy client ID and secret

**OpenAI** (recommendations):
- Get key from https://platform.openai.com/api-keys

4. Add keys to `.env`

5. Make sure FFmpeg is installed:
```bash
# Windows (using Chocolatey)
choco install ffmpeg

# Mac
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

6. Run the dev server:
```bash
npm run dev
```

Open http://localhost:3000

## How to use

1. Connect your Spotify account
2. Upload an edit (MP4 works best)
3. Describe your edit (optional but helps - e.g., "sad anime edit" or "gym motivation")
4. Click "Create Playlist"
5. Check your Spotify for the new playlist

## Why I built this

I kept playling the same edit over and over again, and I wanted something that can take me the the edit and match the vibe. And instead of manually finding songs, I thought it'd be easier to automate it. Spotify's recommendation API got deprecated in November 2024, so I switched to using OpenAI to generate suggestions instead.

## Known issues

- Free ACRCloud tier has limited recognitions per month
- Spotify tokens expire after an hour (need to reconnect)
- FFmpeg needs to be installed globally
- Sometimes AI suggests songs that aren't on Spotify

## License
MIT