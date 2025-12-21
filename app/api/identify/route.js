import { NextResponse } from 'next/server';
import { writeFile, mkdir, stat, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { parseACRCloudResult, searchSpotifyTrack, detectVibeFromGenres } from '../../../lib/spotify.js';

const execPromise = promisify(exec);

function createSignature(accessKey, accessSecret, timestamp) {
  const stringToSign = [
    'POST',
    '/v1/identify',
    accessKey,
    'audio',
    '1',
    timestamp
  ].join('\n');

  const signature = crypto
    .createHmac('sha1', accessSecret)
    .update(Buffer.from(stringToSign, 'utf-8'))
    .digest()
    .toString('base64');
  return signature;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('video');

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tmpDir = os.platform() === 'win32'
      ? path.join(process.cwd(), 'tmp')
      : '/tmp';

    await mkdir(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, 'input.mp4');
    await writeFile(inputPath, buffer);

    //Will Extract 12 seconds of audio with FFmpeg
    const outputPath = path.join(tmpDir, 'clip.wav');
    const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -ss 0 -t 12 -ac 1 -ar 44100 "${outputPath}"`;

    console.log('Running FFmpeg:', ffmpegCommand);
    const {stdout,stderr } =await execPromise(ffmpegCommand);
    console.log('FFmpeg output:', stdout);
    if (stderr) console.log('FFmpeg stderr:',  stderr);

    //Verify output file exists and has non-zero size
    const fileStats = await stat(outputPath);
    if (!fileStats.size) {
      throw new Error('FFmpeg produced an empty file');
    }

    //Call ACRCloud Identify API
    const accessKey = process.env.ACRCLOUD_ACCESS_KEY;
    const accessSecret = process.env.ACRCLOUD_ACCESS_SECRET;
    const host = process.env.ACRCLOUD_HOST;

    if (!accessKey || !accessSecret || !host) {
      throw new Error('ACRCloud credentials not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createSignature(accessKey, accessSecret, timestamp);

    //Read audio file
    const audioBuffer = await readFile(outputPath);

    //Build multipart form-data for ACRCloud
    const acrFormData = new FormData();
    acrFormData.append('sample', new Blob([audioBuffer]), 'clip.wav');
    acrFormData.append('sample_bytes', audioBuffer.length.toString());
    acrFormData.append('access_key', accessKey);
    acrFormData.append('data_type', 'audio');
    acrFormData.append('signature_version', '1');
    acrFormData.append('signature', signature);
    acrFormData.append('timestamp', timestamp);

    console.log('Calling ACRCloud API...');
    const acrResponse = await fetch(`https://${host}/v1/identify`, {
      method: 'POST',
      body: acrFormData,
    });

    const acrResult = await acrResponse.json();
    console.log('ACRCloud response:', JSON.stringify(acrResult, null, 2));

    // Parsse ACRCloud result
    const songInfo = parseACRCloudResult(acrResult);

    if (!songInfo) {
      return NextResponse.json({
        success: false,
        error: 'No music detected in the video',
        acrcloud: acrResult,
      });
    }

    //Gets Spotify token from request (which is passed from frontend)
    const spotifyToken = request.headers.get('x-spotify-token');
    console.log('Spotify token present:', !!spotifyToken);

    let spotifyTrack = null;
    let vibe = null;

    if (spotifyToken) {
      try {
        console.log('Searching Spotify for:', songInfo.title, 'by', songInfo.artists);
        spotifyTrack = await searchSpotifyTrack(
          songInfo.title,
          songInfo.artists,
          spotifyToken
        );
        console.log('Spotify track found:', !!spotifyTrack);

        if (spotifyTrack) {
          // Detect vibe using genre-based detection from ACRCloud
          console.log('Using genre-based vibe detection. Genres:', songInfo.genres);
          vibe = detectVibeFromGenres(songInfo.genres);
          console.log('Detected vibe:', vibe);
        } else {
          console.log('No Spotify track found, skipping vibe detection');
        }
      } catch (error) {
        console.error('Spotify search error:', error);
        console.error('Error details:', error.message, error.stack);
      }
    } else {
      console.log('No Spotify token provided, skipping Spotify search');
    }

    return NextResponse.json({
      success: true,
      song: songInfo,
      spotifyTrack,
      vibe,
      acrcloud: acrResult,
      debug: {
        inputSize: buffer.length,
        audioSize: fileStats.size,
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
