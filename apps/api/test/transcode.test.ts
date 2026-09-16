import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ffmpegPath } from '../src/ffbin';
import {
  transcodeToHls, generateThumbnails, extractStills, probeDuration, DEFAULT_LADDER,
} from '../src/transcode';

const TINY_LADDER = [
  { name: '360p', width: 640, height: 360, vBitrateK: 500 },
  { name: '240p', width: 426, height: 240, vBitrateK: 250 },
];

let clip: string; let out: string;

beforeAll(() => {
  const dir = mkdtempSync(path.join(tmpdir(), 'aurora-ffm-'));
  clip = path.join(dir, 'clip.mp4');
  out = path.join(dir, 'out');
  // clipe sintético 5s com áudio — não depende de download
  execFileSync(ffmpegPath, [
    '-f', 'lavfi', '-i', 'testsrc2=duration=5:size=1280x720:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', clip,
  ]);
});

describe('pipeline FFmpeg', () => {
  it('escada default tem os 4 degraus do spec', () => {
    expect(DEFAULT_LADDER.map((r) => r.name)).toEqual(['1080p', '720p', '480p', '360p']);
    expect(DEFAULT_LADDER[0].vBitrateK).toBe(5000);
  });

  it('probeDuration lê ~5s', async () => {
    expect(await probeDuration(clip)).toBeCloseTo(5, 0);
  });

  it('gera master.m3u8 com todas as variantes + segmentos', async () => {
    const pcts: number[] = [];
    await transcodeToHls(clip, out, { ladder: TINY_LADDER, onProgress: (p) => pcts.push(p) });
    const master = readFileSync(path.join(out, 'master.m3u8'), 'utf8');
    expect(master).toContain('360p/index.m3u8');
    expect(master).toContain('240p/index.m3u8');
    expect(existsSync(path.join(out, '360p', 'seg_000.ts'))).toBe(true);
    expect(pcts.length).toBeGreaterThan(0);
    expect(Math.max(...pcts)).toBe(100);
  });

  it('gera sprite + thumbnails.vtt com xywh', async () => {
    const tdir = path.join(out, 'thumbs');
    await generateThumbnails(clip, tdir, 'hls/demo/thumbs');
    const vtt = readFileSync(path.join(tdir, 'thumbnails.vtt'), 'utf8');
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('sprite_0.jpg#xywh=0,0,160,90');
    expect(existsSync(path.join(tdir, 'sprite_0.jpg'))).toBe(true);
  });

  it('multi-áudio: master ganha grupo EXT-X-MEDIA com renditions', async () => {
    const outMulti = path.join(path.dirname(clip), 'out-multi');
    await transcodeToHls(clip, outMulti, {
      ladder: [TINY_LADDER[1]] as any,
      audioTracks: [
        { lang: 'eng', name: 'original', isDefault: true },
        { file: clip, lang: 'por', name: 'dublado' }, // segunda faixa vinda de outro arquivo
      ],
    });
    const master = readFileSync(path.join(outMulti, 'master.m3u8'), 'utf8');
    expect(master).toContain('#EXT-X-MEDIA:TYPE=AUDIO');
    expect(master).toContain('LANGUAGE="por"');
    expect(master).toContain('LANGUAGE="eng"');
    expect(master).toContain('DEFAULT=YES');
    expect(existsSync(path.join(outMulti, 'dublado', 'index.m3u8'))).toBe(true);
    expect(existsSync(path.join(outMulti, 'original', 'index.m3u8'))).toBe(true);
  });

  it('extrai poster e backdrop', async () => {
    const idir = path.join(out, 'images');
    await extractStills(clip, idir);
    expect(existsSync(path.join(idir, 'poster.jpg'))).toBe(true);
    expect(existsSync(path.join(idir, 'backdrop.jpg'))).toBe(true);
  });
});
