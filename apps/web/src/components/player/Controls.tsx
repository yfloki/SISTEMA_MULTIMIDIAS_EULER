'use client';
import { useMemo, useRef, useState } from 'react';
import type { Title } from '@aurora/shared';
import { findThumbCue, type ThumbCue } from './ThumbStrip';
import type { QualityLevel, AudioTrackInfo } from './usePlayer';

function PlayGlyph({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

/** Setinha circular com "10" dentro, como a Netflix. */
function Seek10Glyph({ forward = false, className = 'size-8' }:
  { forward?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={forward
        ? 'M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z'
        : 'M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z'} />
      <text x="12" y="16.8" textAnchor="middle" fontSize="7" fontWeight="700"
        fill="currentColor" stroke="none">10</text>
    </svg>
  );
}

function BackGlyph({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

export function VolumeGlyph({ muted, volume, className = 'size-6' }:
  { muted: boolean; volume: number; className?: string }) {
  if (muted || volume === 0) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  if (volume < 0.5) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M5 9v6h4l5 5V4L9 9H5zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

/** Balão de "Áudio e legendas", como o da Netflix. */
function AudioSubsGlyph({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 6h10v2H7V6zm0 4h10v2H7v-2z" />
    </svg>
  );
}

function FullscreenGlyph({ exit = false, className = 'size-6' }:
  { exit?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={exit
        ? 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'
        : 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'} />
    </svg>
  );
}

function CheckGlyph({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface ControlsProps {
  visible: boolean;
  title: Title;
  isLive: boolean;
  playing: boolean;
  position: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  levels: QualityLevel[];
  currentLevel: number;
  autoLevel: number;
  audioTracks: AudioTrackInfo[];
  currentAudio: number;
  onSetAudio: (id: number) => void;
  thumbCues: ThumbCue[];
  thumbsBaseUrl: string;
  activeSubtitle: string | null;
  fullscreen: boolean;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onSeekBy: (d: number) => void;
  onSetVolume: (v: number) => void;
  onToggleMute: () => void;
  onSetLevel: (idx: number) => void;
  onSetSubtitle: (lang: string | null) => void;
  onToggleFullscreen: () => void;
  onBack: () => void;
}

export function Controls(props: ControlsProps) {
  const {
    visible, title, isLive, playing, position, duration, buffered, volume, muted,
    levels, currentLevel, autoLevel, audioTracks, currentAudio, onSetAudio,
    thumbCues, thumbsBaseUrl, activeSubtitle, fullscreen,
    onTogglePlay, onSeek, onSeekBy, onSetVolume, onToggleMute, onSetLevel, onSetSubtitle,
    onToggleFullscreen, onBack,
  } = props;

  const barRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [tracksOpen, setTracksOpen] = useState(false);

  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const hoverCue = useMemo(() => {
    if (hoverPct === null || !thumbCues.length || !duration) return null;
    return findThumbCue(thumbCues, (hoverPct / 100) * duration) ?? null;
  }, [hoverPct, thumbCues, duration]);

  const pctFromEvent = (e: React.MouseEvent): number => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
  };

  const activeIdx = currentLevel === -1 ? autoLevel : currentLevel;
  const activeLevel = levels.find((l) => l.index === activeIdx);
  const qualityLabel = currentLevel === -1
    ? `Auto${activeLevel ? ` (${activeLevel.height}p)` : ''}`
    : activeLevel ? `${activeLevel.height}p` : 'Auto';

  return (
    <div className={`pointer-events-none absolute inset-0 flex flex-col justify-between
      bg-gradient-to-t from-black/85 via-transparent to-black/50 transition-opacity duration-300
      ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="pointer-events-auto flex items-center gap-4 p-6">
        <button onClick={onBack} aria-label="Voltar" className="transition-transform hover:scale-110">
          <BackGlyph />
        </button>
        <div>
          <p className="font-display text-lg font-bold">{title.name}</p>
          {isLive && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold">● AO VIVO</span>
          )}
        </div>
      </div>

      {!playing ? (
        <button onClick={onTogglePlay} aria-label="Reproduzir"
          className="pointer-events-auto mx-auto grid size-20 place-items-center rounded-full
            bg-white/15 backdrop-blur-sm transition hover:scale-110 hover:bg-white/25">
          <PlayGlyph className="size-10 translate-x-0.5" />
        </button>
      ) : (
        <div className="mx-auto" />
      )}

      <div className="pointer-events-auto flex flex-col gap-2 p-6">
        {!isLive && (
          <div className="relative">
            {hoverCue && (
              <div
                className="glass pointer-events-none absolute bottom-8 -translate-x-1/2 overflow-hidden rounded-lg border border-(--accent)"
                style={{ left: `${hoverPct}%`, width: hoverCue.w, height: hoverCue.h }}
              >
                <div
                  style={{
                    backgroundImage: `url(${thumbsBaseUrl}${hoverCue.sprite})`,
                    backgroundPosition: `-${hoverCue.x}px -${hoverCue.y}px`,
                    width: hoverCue.w,
                    height: hoverCue.h,
                  }}
                />
              </div>
            )}
            <div
              ref={barRef}
              // arrasto com pointer capture: segura e arrasta como na Netflix
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setScrubbing(true);
                onSeek((pctFromEvent(e) / 100) * duration);
              }}
              onPointerMove={(e) => {
                setHoverPct(pctFromEvent(e));
                if (scrubbing) onSeek((pctFromEvent(e) / 100) * duration);
              }}
              onPointerUp={(e) => {
                setScrubbing(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onMouseLeave={() => { if (!scrubbing) setHoverPct(null); }}
              style={{ touchAction: 'none' }}
              className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5"
            >
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufferedPct}%` }} />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-(--accent) to-(--accent2)"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg opacity-0 group-hover:opacity-100"
                style={{ left: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button onClick={onTogglePlay} aria-label={playing ? 'Pausar' : 'Reproduzir'}
            className="transition-transform hover:scale-110">
            {playing ? <PauseGlyph className="size-7" /> : <PlayGlyph className="size-7" />}
          </button>
          {!isLive && (
            <>
              <button onClick={() => onSeekBy(-10)} aria-label="Voltar 10 segundos"
                className="transition-transform hover:scale-110">
                <Seek10Glyph className="size-8" />
              </button>
              <button onClick={() => onSeekBy(10)} aria-label="Avançar 10 segundos"
                className="transition-transform hover:scale-110">
                <Seek10Glyph forward className="size-8" />
              </button>
            </>
          )}

          <div className="group/vol flex items-center gap-2">
            <button onClick={onToggleMute} aria-label={muted ? 'Ativar som' : 'Mudo'}
              className="transition-transform hover:scale-110">
              <VolumeGlyph muted={muted} volume={volume} />
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-0 accent-(--accent) opacity-0 transition-all group-hover/vol:w-20 group-hover/vol:opacity-100"
            />
          </div>

          {!isLive && (
            <span className="text-sm text-muted">{fmt(position)} / {fmt(duration)}</span>
          )}

          <div className="ml-auto flex items-center gap-4">
            {(audioTracks.length > 0 || title.subtitles.length > 0) && (
              <div className="relative">
                <button
                  onClick={() => { setTracksOpen((v) => !v); setQualityOpen(false); }}
                  aria-label="Áudio e legendas" className="transition-transform hover:scale-110"
                >
                  <AudioSubsGlyph />
                </button>
                {tracksOpen && (
                  <div className="glass absolute bottom-10 right-0 flex gap-6 rounded-lg px-5 py-4 text-sm">
                    {audioTracks.length > 0 && (
                      <div className="min-w-44">
                        <p className="mb-2 px-2 text-base font-semibold">Áudio</p>
                        {audioTracks.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => { onSetAudio(t.id); setTracksOpen(false); }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10
                              ${currentAudio === t.id ? 'font-semibold' : 'text-muted'}`}
                          >
                            <span className="w-4">{currentAudio === t.id && <CheckGlyph />}</span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {title.subtitles.length > 0 && (
                      <div className="min-w-40">
                        <p className="mb-2 px-2 text-base font-semibold">Legendas</p>
                        <button
                          onClick={() => { onSetSubtitle(null); setTracksOpen(false); }}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10
                            ${!activeSubtitle ? 'font-semibold' : 'text-muted'}`}
                        >
                          <span className="w-4">{!activeSubtitle && <CheckGlyph />}</span>
                          Desligadas
                        </button>
                        {title.subtitles.map((s) => (
                          <button
                            key={s.lang}
                            onClick={() => { onSetSubtitle(s.lang); setTracksOpen(false); }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10
                              ${activeSubtitle === s.lang ? 'font-semibold' : 'text-muted'}`}
                          >
                            <span className="w-4">{activeSubtitle === s.lang && <CheckGlyph />}</span>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {levels.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => { setQualityOpen((v) => !v); setTracksOpen(false); }}
                  className="text-sm font-semibold"
                >
                  {qualityLabel}
                </button>
                {qualityOpen && (
                  <div className="glass absolute bottom-8 right-0 min-w-32 rounded-lg p-2 text-sm">
                    <button
                      onClick={() => { onSetLevel(-1); setQualityOpen(false); }}
                      className={`block w-full rounded px-3 py-1.5 text-left hover:bg-white/10 ${currentLevel === -1 ? 'text-(--accent2)' : ''}`}
                    >
                      Auto
                    </button>
                    {levels.map((l) => (
                      <button
                        key={l.index}
                        onClick={() => { onSetLevel(l.index); setQualityOpen(false); }}
                        className={`block w-full rounded px-3 py-1.5 text-left hover:bg-white/10 ${currentLevel === l.index ? 'text-(--accent2)' : ''}`}
                      >
                        {l.height}p
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={onToggleFullscreen} aria-label="Tela cheia"
              className="transition-transform hover:scale-110">
              <FullscreenGlyph exit={fullscreen} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
