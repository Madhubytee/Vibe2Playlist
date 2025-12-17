import { NextResponse } from 'next/server';
import { writeFile, mkdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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

    // Extract 12 seconds of audio with FFmpeg
    const outputPath = path.join(tmpDir, 'clip.wav');
    const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -ss 0 -t 12 -ac 1 -ar 44100 "${outputPath}"`;

    console.log('Running FFmpeg:', ffmpegCommand);
    const {stdout,stderr } =await execPromise(ffmpegCommand);
    console.log('FFmpeg output:', stdout);
    if (stderr) console.log('FFmpeg stderr:',  stderr);

    // Verify output file exists and has non-zero size
    const fileStats = await stat(outputPath);
    if (!fileStats.size) {
      throw new Error('FFmpeg produced an empty file');
    }

    return NextResponse.json({
      success: true,
      message: 'Audio extracted successfully',
      inputPath,
      outputPath,
      inputSize: buffer.length,
      outputSize: fileStats.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
