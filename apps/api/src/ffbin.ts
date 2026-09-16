import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export const ffmpegPath: string = ffmpegStatic as unknown as string;
export const ffprobePath: string = (ffprobeStatic as any).path as string;
