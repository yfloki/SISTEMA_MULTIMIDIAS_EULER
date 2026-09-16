'use client';
import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';

export interface HlsStats {
  levelIndex: number;      // nível em reprodução (ABR ou manual)
  levelHeight: number;     // ex.: 720
  levelBitrate: number;    // bps do nível atual
  bandwidth: number;       // estimativa de banda do hls.js (bps)
  bufferAheadS: number;    // segundos bufferizados à frente do playhead
  droppedFrames: number;
  auto: boolean;           // ABR automático?
}

/** Janela deslizante para o sparkline (pura, testável). */
export function pushSample(series: number[], value: number, max = 60): number[] {
  const next = [...series, value];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Converte a série em pontos de um <polyline> SVG (pura, testável). */
export function sparklinePoints(series: number[], w: number, h: number): string {
  if (series.length < 2) return '';
  const max = Math.max(...series, 1);
  const stepX = w / (series.length - 1);
  return series
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(' ');
}

export function useHlsStats(
  hlsRef: React.RefObject<Hls | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [stats, setStats] = useState<HlsStats | null>(null);
  const [series, setSeries] = useState<number[]>([]);
  const seriesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const hls = hlsRef.current;
      const video = videoRef.current;
      if (!hls || !video) return;
      const levelIndex = hls.currentLevel >= 0 ? hls.currentLevel : hls.nextAutoLevel;
      const level = hls.levels?.[levelIndex];
      let bufferAheadS = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
          bufferAheadS = video.buffered.end(i) - video.currentTime;
          break;
        }
      }
      const quality = video.getVideoPlaybackQuality?.();
      const sample: HlsStats = {
        levelIndex,
        levelHeight: level?.height ?? 0,
        levelBitrate: level?.bitrate ?? 0,
        bandwidth: hls.bandwidthEstimate ?? 0,
        bufferAheadS,
        droppedFrames: quality?.droppedVideoFrames ?? 0,
        auto: hls.autoLevelEnabled,
      };
      setStats(sample);
      seriesRef.current = pushSample(seriesRef.current, sample.levelBitrate / 1000);
      setSeries(seriesRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, hlsRef, videoRef]);

  return { stats, series };
}

export interface ThrottlePreset { label: string; bps: number | null }

export const THROTTLE_PRESETS: ThrottlePreset[] = [
  { label: 'Ilimitado', bps: null },
  { label: '4 Mbps', bps: 4_000_000 },
  { label: '1,5 Mbps', bps: 1_500_000 },
  { label: '600 kbps', bps: 600_000 },
];

/** Índice de capping do ABR para um teto de banda (pura, testável). */
export function cappingLevelFor(levels: { bitrate: number }[], bps: number | null): number {
  if (bps === null || !levels.length) return -1; // sem cap
  let best = -1;
  levels.forEach((l, i) => {
    if (l.bitrate <= bps && (best === -1 || l.bitrate > levels[best].bitrate)) best = i;
  });
  return best === -1 ? 0 : best; // se tudo acima do teto, trava no mais leve
}

export function applyThrottle(hls: Hls | null, bps: number | null) {
  if (!hls) return;
  hls.autoLevelCapping = cappingLevelFor(hls.levels ?? [], bps);
}
