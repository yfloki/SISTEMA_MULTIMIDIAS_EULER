'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Title } from '@aurora/shared';
import { mediaUrl } from '@/lib/config';
import { putProgress } from '@/lib/api';
import { usePlayer } from './usePlayer';
import { Controls, VolumeGlyph } from './Controls';
import { BrandIntro } from './BrandIntro';
import { parseThumbsVtt, type ThumbCue } from './ThumbStrip';
import { useHlsStats, applyThrottle } from './useHlsStats';
import { StatsPanel } from './StatsPanel';

export function Player({ title, profileId, startPositionS = 0, isLive = false }: {
  title: Title; profileId: string; startPositionS?: number; isLive?: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const src = title.hlsPath ? mediaUrl(title.hlsPath) : null;

  // vinheta da marca antes do conteúdo (só quando começa do zero — retomar
  // de onde parou pula direto pro filme); autoplay travado até ela acabar
  const [introDone, setIntroDone] = useState(startPositionS > 0);

  const {
    videoRef, hlsRef, playing, position, duration, buffered, volume, muted,
    togglePlay, seek, seekBy, setVolume, toggleMute, play,
    levels, currentLevel, autoLevel, setLevel,
    audioTracks, currentAudio, setAudioTrack, ready, error, retry,
  } = usePlayer(src, startPositionS, introDone);

  const [showStats, setShowStats] = useState(false);
  const [throttleBps, setThrottleBps] = useState<number | null>(null);
  const { stats, series } = useHlsStats(hlsRef, videoRef, showStats);
  const handleThrottle = useCallback((bps: number | null) => {
    setThrottleBps(bps);
    applyThrottle(hlsRef.current, bps);
  }, [hlsRef]);

  const [visible, setVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbCues, setThumbCues] = useState<ThumbCue[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!title.thumbsVtt) { setThumbCues([]); return; }
    fetch(mediaUrl(title.thumbsVtt))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('sem thumbnails'))))
      .then((text) => setThumbCues(parseThumbsVtt(text)))
      .catch(() => setThumbCues([]));
  }, [title.thumbsVtt]);

  const thumbsBaseUrl = title.thumbsVtt ? mediaUrl(title.thumbsVtt).replace(/[^/]+$/, '') : '';

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setVisible(false), 3000);
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      resetHideTimer();
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          seekBy(-10);
          break;
        case 'arrowright':
          seekBy(10);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'd':
          setShowStats((s) => !s);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seekBy, toggleMute, toggleFullscreen, resetHideTimer]);

  useEffect(() => {
    if (isLive || !duration) return;
    if (position - lastSaved.current >= 5) {
      lastSaved.current = position;
      putProgress(profileId, title.id, position, duration).catch(() => {});
    }
  }, [position, duration, isLive, profileId, title.id]);

  useEffect(() => () => {
    const v = videoRef.current;
    if (!isLive && v && v.duration) {
      putProgress(profileId, title.id, v.currentTime, v.duration).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSubtitle = useCallback((lang: string | null) => {
    setActiveSubtitle(lang);
    const tracks = videoRef.current?.textTracks;
    if (!tracks) return;
    const want = lang?.toLowerCase() ?? null;
    for (let i = 0; i < tracks.length; i++) {
      const trackLang = (tracks[i].language || '').toLowerCase();
      const match = want !== null && (trackLang === want || trackLang.startsWith(want.split('-')[0]));
      tracks[i].mode = match ? 'showing' : 'disabled';
    }
  }, [videoRef]);

  if (!src) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg text-center">
        <div>
          <p className="font-display mb-2 text-2xl font-bold">{title.name}</p>
          <p className="mb-6 text-muted">Disponível em breve — este título ainda está sendo processado.</p>
          <button onClick={() => router.back()} className="glass rounded-lg px-6 py-3 font-semibold">
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      className={`relative h-screen w-screen overflow-hidden bg-black ${!visible && playing ? 'cursor-none' : ''}`}
    >
      <video
        ref={videoRef}
        className="size-full object-contain"
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
      >
        {title.subtitles.map((s) => (
          <track key={s.lang} kind="subtitles" srcLang={s.lang} label={s.label} src={mediaUrl(s.path)} />
        ))}
      </video>

      {!introDone && !error && (
        <BrandIntro onDone={() => { setIntroDone(true); play(); }} />
      )}

      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="size-12 animate-spin rounded-full border-4 border-(--accent) border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 text-center">
          <div>
            <p className="mb-4 text-lg font-semibold">{error}</p>
            <button
              onClick={retry}
              className="rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) px-6 py-3 font-semibold"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {showStats && !error && (
        <StatsPanel stats={stats} series={series}
          throttleBps={throttleBps} onThrottle={handleThrottle} />
      )}

      {playing && muted && (
        <button onClick={toggleMute}
          className="glass absolute bottom-28 left-6 z-50 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
          <VolumeGlyph muted={false} volume={1} className="size-4" /> Ativar som
        </button>
      )}

      {!error && visible && (
        <button
          onClick={() => setShowStats((s) => !s)}
          title="Stats for nerds (D)"
          className="glass absolute right-4 top-4 z-50 rounded-lg px-3 py-1.5 text-sm"
        >
          📊
        </button>
      )}

      {!error && (
        <Controls
          visible={visible}
          title={title}
          isLive={isLive}
          playing={playing}
          position={position}
          duration={duration}
          buffered={buffered}
          volume={volume}
          muted={muted}
          levels={levels}
          currentLevel={currentLevel}
          autoLevel={autoLevel}
          audioTracks={audioTracks}
          currentAudio={currentAudio}
          onSetAudio={setAudioTrack}
          thumbCues={thumbCues}
          thumbsBaseUrl={thumbsBaseUrl}
          activeSubtitle={activeSubtitle}
          fullscreen={fullscreen}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSeekBy={seekBy}
          onSetVolume={setVolume}
          onToggleMute={toggleMute}
          onSetLevel={setLevel}
          onSetSubtitle={setSubtitle}
          onToggleFullscreen={toggleFullscreen}
          onBack={() => router.back()}
        />
      )}
    </div>
  );
}
