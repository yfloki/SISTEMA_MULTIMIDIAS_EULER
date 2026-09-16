import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegPath, ffprobePath } from './ffbin';

const execFileP = promisify(execFile);

export type Rung = { name: string; width: number; height: number; vBitrateK: number };

/**
 * Faixa de áudio alternativa para o grupo EXT-X-MEDIA do HLS.
 * `file` omitido = usa o áudio do próprio vídeo de entrada.
 * `name` vira o diretório da rendition e o NAME no master (sem espaços).
 */
export type AudioTrackSpec = { file?: string; lang: string; name: string; isDefault?: boolean };

export const DEFAULT_LADDER: Rung[] = [
  { name: '1080p', width: 1920, height: 1080, vBitrateK: 5000 },
  { name: '720p', width: 1280, height: 720, vBitrateK: 3000 },
  { name: '480p', width: 854, height: 480, vBitrateK: 1500 },
  { name: '360p', width: 640, height: 360, vBitrateK: 800 },
];

export async function probeDuration(input: string): Promise<number> {
  const { stdout } = await execFileP(ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input,
  ]);
  return parseFloat(stdout.trim());
}

async function probeHeight(input: string): Promise<number> {
  const { stdout } = await execFileP(ffprobePath, [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=height', '-of', 'csv=p=0', input,
  ]);
  return parseInt(stdout.trim(), 10) || 0;
}

function parseTimeToSeconds(t: string): number {
  const [h, m, s] = t.split(':');
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(s);
}

export async function transcodeToHls(
  input: string,
  outDir: string,
  opts: {
    onProgress?: (pct: number) => void;
    ladder?: Rung[];
    audioTracks?: AudioTrackSpec[];
  } = {},
): Promise<void> {
  // não gera renditions acima da resolução da fonte (upscale só desperdiça)
  const srcHeight = await probeHeight(input);
  const fullLadder = opts.ladder ?? DEFAULT_LADDER;
  const fitted = srcHeight > 0 ? fullLadder.filter((r) => r.height <= srcHeight) : fullLadder;
  const ladder = fitted.length ? fitted : [fullLadder[fullLadder.length - 1]];
  const audio = opts.audioTracks && opts.audioTracks.length >= 2 ? opts.audioTracks : null;
  fs.mkdirSync(outDir, { recursive: true });
  const duration = await probeDuration(input);

  const split = ladder.map((_, i) => `[v${i}]`).join('');
  const scales = ladder
    .map((r, i) => `[v${i}]scale=w=${r.width}:h=${r.height}:force_original_aspect_ratio=decrease:force_divisible_by=2[v${i}o]`)
    .join(';');
  const filter = `[0:v]split=${ladder.length}${split};${scales}`;

  const args: string[] = ['-y', '-i', input];
  const audioInputIdx: number[] = [];
  if (audio) {
    for (const t of audio) {
      if (t.file) {
        args.push('-i', t.file);
        audioInputIdx.push((args.filter((a) => a === '-i').length - 1));
      } else {
        audioInputIdx.push(0);
      }
    }
  }
  args.push('-filter_complex', filter);

  ladder.forEach((r, i) => {
    args.push('-map', `[v${i}o]`);
    if (!audio) args.push('-map', '0:a:0'); // áudio muxado por variante (modo simples)
    args.push(
      `-c:v:${i}`, 'libx264', `-profile:v:${i}`, 'high', '-preset', 'veryfast',
      `-b:v:${i}`, `${r.vBitrateK}k`, `-maxrate:v:${i}`, `${Math.round(r.vBitrateK * 1.1)}k`,
      `-bufsize:v:${i}`, `${r.vBitrateK * 2}k`,
    );
  });
  if (audio) {
    audio.forEach((t, j) => {
      args.push('-map', `${audioInputIdx[j]}:a:0`, `-c:a:${j}`, 'aac', `-b:a:${j}`, '128k');
    });
  }

  const varStreamMap = audio
    ? [
        ...ladder.map((r, i) => `v:${i},agroup:aud,name:${r.name}`),
        ...audio.map((t, j) =>
          `a:${j},agroup:aud,language:${t.lang},name:${t.name}${t.isDefault ? ',default:yes' : ''}`),
      ].join(' ')
    : ladder.map((r, i) => `v:${i},a:${i},name:${r.name}`).join(' ');

  // Saídas relativas + cwd no outDir: garante URIs relativas no master.m3u8
  // (com caminho absoluto o ffmpeg grava o path do Windows dentro da playlist).
  args.push(
    ...(audio ? [] : ['-c:a', 'aac', '-b:a', '128k']),
    '-ar', '48000',
    '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
    '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod',
    '-hls_segment_filename', '%v/seg_%03d.ts',
    '-master_pl_name', 'master.m3u8',
    '-var_stream_map', varStreamMap,
    '%v/index.m3u8',
  );
  for (const r of ladder) fs.mkdirSync(path.join(outDir, r.name), { recursive: true });
  if (audio) for (const t of audio) fs.mkdirSync(path.join(outDir, t.name), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { cwd: outDir });
    let stderr = '';
    proc.stderr.on('data', (buf: Buffer) => {
      const text = buf.toString();
      stderr += text;
      const m = text.match(/time=(\d+:\d+:\d+\.\d+)/);
      if (m && duration > 0 && opts.onProgress) {
        opts.onProgress(Math.min(99, (parseTimeToSeconds(m[1]) / duration) * 100));
      }
    });
    proc.on('error', reject);
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com código ${code}\n${stderr.slice(-4000)}`)),
    );
  });
  opts.onProgress?.(100);
}

const THUMB_W = 160; const THUMB_H = 90; const THUMB_INTERVAL = 10; const GRID = 10;

export async function generateThumbnails(
  input: string, outDir: string, _mediaPrefix: string,
): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const duration = await probeDuration(input);
  // ffmpeg numera folhas a partir de 1 com sprite_%d.jpg; geramos e renomeamos para base 0
  await execFileP(ffmpegPath, [
    '-y', '-i', input,
    '-vf', `fps=1/${THUMB_INTERVAL},scale=${THUMB_W}:${THUMB_H},tile=${GRID}x${GRID}`,
    '-q:v', '5', path.join(outDir, 'sprite_%d.jpg'),
  ]);
  const sheets = fs.readdirSync(outDir)
    .filter((f) => /^sprite_\d+\.jpg$/.test(f))
    .map((f) => parseInt(f.match(/(\d+)/)![1], 10))
    .sort((a, b) => a - b);
  for (const n of sheets) {
    fs.renameSync(path.join(outDir, `sprite_${n}.jpg`), path.join(outDir, `tmp_${n - 1}.jpg`));
  }
  for (const n of sheets) {
    fs.renameSync(path.join(outDir, `tmp_${n - 1}.jpg`), path.join(outDir, `sprite_${n - 1}.jpg`));
  }

  const count = Math.max(1, Math.ceil(duration / THUMB_INTERVAL));
  const perSheet = GRID * GRID;
  const fmt = (s: number) => {
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    return `${hh}:${mm}:${ss}.000`;
  };
  let vtt = 'WEBVTT\n\n';
  for (let i = 0; i < count; i++) {
    const sheet = Math.floor(i / perSheet);
    const idx = i % perSheet;
    const x = (idx % GRID) * THUMB_W;
    const y = Math.floor(idx / GRID) * THUMB_H;
    vtt += `${fmt(i * THUMB_INTERVAL)} --> ${fmt(Math.min((i + 1) * THUMB_INTERVAL, Math.max(duration, 1)))}\n`;
    vtt += `sprite_${sheet}.jpg#xywh=${x},${y},${THUMB_W},${THUMB_H}\n\n`;
  }
  fs.writeFileSync(path.join(outDir, 'thumbnails.vtt'), vtt);
}

export async function extractStills(input: string, outDir: string): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const duration = await probeDuration(input);
  const at = Math.min(60, duration / 2);
  await execFileP(ffmpegPath, [
    '-y', '-ss', String(at), '-i', input, '-frames:v', '1',
    '-vf', 'scale=600:-2', path.join(outDir, 'poster.jpg'),
  ]);
  await execFileP(ffmpegPath, [
    '-y', '-ss', String(at), '-i', input, '-frames:v', '1',
    '-vf', 'scale=1920:-2', path.join(outDir, 'backdrop.jpg'),
  ]);
}
