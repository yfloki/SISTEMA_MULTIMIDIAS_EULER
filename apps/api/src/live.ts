import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import NodeMediaServer from 'node-media-server';
import type { LiveStatus } from '@aurora/shared';
import { ffmpegPath } from './ffbin';

interface Opts {
  hlsDir: string;
  spawnFfmpeg?: (args: string[]) => ChildProcess;
}

export interface RestreamState {
  enabled: boolean;
  /** URL RTMP completa de destino (ex.: rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx) */
  url: string | null;
  /** true enquanto o relay FFmpeg está rodando */
  running: boolean;
}

export function createLiveManager(opts: Opts) {
  const spawnFfmpeg = opts.spawnFfmpeg ?? ((args: string[]) => spawn(ffmpegPath, args));
  let status: LiveStatus = { active: false, key: null, hlsPath: null, startedAt: null };
  let proc: ChildProcess | null = null;
  let restreamProc: ChildProcess | null = null;
  const restream: RestreamState = {
    enabled: false,
    url: process.env.YOUTUBE_RTMP_URL ?? null,
    running: false,
  };

  function startRestream() {
    if (!status.active || !restream.enabled || !restream.url || restreamProc) return;
    // Relay sem re-encode: copia o stream que chega no ingest direto para o YouTube.
    restreamProc = spawnFfmpeg([
      '-i', `rtmp://127.0.0.1:1935/live/${status.key}`,
      '-c', 'copy', '-f', 'flv', restream.url,
    ]);
    restream.running = true;
    restreamProc.on?.('close', () => { restream.running = false; restreamProc = null; });
  }

  function stopRestream() {
    restreamProc?.kill('SIGKILL');
    restreamProc = null;
    restream.running = false;
  }

  function setRestream(input: { enabled: boolean; url?: string | null }) {
    restream.enabled = input.enabled;
    if (input.url !== undefined) restream.url = input.url;
    if (restream.enabled) startRestream();
    else stopRestream();
    return getRestream();
  }

  const getRestream = (): RestreamState => ({ ...restream });

  function onPublish(key: string) {
    const outDir = path.join(opts.hlsDir, 'live', key);
    fs.mkdirSync(outDir, { recursive: true });
    proc = spawnFfmpeg([
      '-i', `rtmp://127.0.0.1:1935/live/${key}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
      '-b:v', '2500k', '-g', '60', '-sc_threshold', '0',
      '-c:a', 'aac', '-b:a', '128k',
      '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+independent_segments',
      path.join(outDir, 'index.m3u8'),
    ]);
    status = {
      active: true, key,
      hlsPath: `hls/live/${key}/index.m3u8`,
      startedAt: new Date().toISOString(),
    };
    startRestream();
  }

  function onDone(key: string) {
    if (status.key !== key) return;
    proc?.kill('SIGKILL');
    proc = null;
    stopRestream();
    status = { active: false, key: null, hlsPath: null, startedAt: null };
  }

  function start() {
    const nms = new NodeMediaServer({
      rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
      http: { port: 8899, allow_origin: '*' }, // exigido pela lib; não usamos esse HTTP
    });
    // StreamPath tem formato /live/<key>
    nms.on('postPublish', (_id: string, streamPath: string) => {
      const key = streamPath.split('/').pop()!;
      onPublish(key);
    });
    nms.on('donePublish', (_id: string, streamPath: string) => {
      const key = streamPath.split('/').pop()!;
      onDone(key);
    });
    nms.run();
    console.log('[api] RTMP ingest em rtmp://localhost:1935/live/<chave>');
  }

  return { start, getStatus: () => status, onPublish, onDone, setRestream, getRestream };
}

export type LiveManager = ReturnType<typeof createLiveManager>;
