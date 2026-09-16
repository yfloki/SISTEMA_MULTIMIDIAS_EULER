'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_URL, mediaUrl } from '@/lib/config';
import { usePlayer } from '@/components/player/usePlayer';

interface Preview {
  name: string; synopsis: string; year: number; durationS: number;
  poster: string | null; hlsPath: string;
  subtitles: { lang: string; label: string; path: string }[];
}

/**
 * Página aberta (sem login) para avaliação externa: toca o HLS no navegador e
 * mostra a URL do .m3u8 para quem quiser puxar em VLC/ffmpeg/analisador.
 */
export default function PreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/titles/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('404'))))
      .then(setData)
      .catch(() => setFailed(true));
  }, [slug]);

  const src = data ? mediaUrl(data.hlsPath) : null;
  const {
    videoRef, levels, currentLevel, autoLevel, setLevel,
    audioTracks, currentAudio, setAudioTrack, error,
  } = usePlayer(src, 0, false);

  const absoluteM3u8 = src
    ? new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').href
    : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteM3u8);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard bloqueado: o input segue selecionável */ }
  }

  if (failed) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg text-muted">
        Título não encontrado.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">{data?.name ?? 'Carregando…'}</h1>
        {data && (
          <p className="mt-1 text-sm text-muted">
            {data.year} · {Math.round(data.durationS / 60)} min · HLS adaptativo
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            controls
            playsInline
            crossOrigin="anonymous"
            poster={data?.poster ? mediaUrl(data.poster) : undefined}
            className="aspect-video w-full"
          >
            {data?.subtitles.map((s) => (
              <track key={s.lang} kind="subtitles" srcLang={s.lang}
                label={s.label} src={mediaUrl(s.path)} />
            ))}
          </video>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {(levels.length > 0 || audioTracks.length > 1) && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            {levels.length > 0 && (
              <label className="flex items-center gap-2">
                <span className="text-muted">Qualidade</span>
                <select
                  value={currentLevel}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="rounded-md bg-white/10 px-2 py-1"
                >
                  <option value={-1}>
                    Auto{autoLevel >= 0 && levels.find((l) => l.index === autoLevel)
                      ? ` (${levels.find((l) => l.index === autoLevel)!.height}p)` : ''}
                  </option>
                  {levels.map((l) => (
                    <option key={l.index} value={l.index}>
                      {l.height}p · {Math.round(l.bitrate / 1000)} kbps
                    </option>
                  ))}
                </select>
              </label>
            )}
            {audioTracks.length > 1 && (
              <label className="flex items-center gap-2">
                <span className="text-muted">Áudio</span>
                <select
                  value={currentAudio}
                  onChange={(e) => setAudioTrack(Number(e.target.value))}
                  className="rounded-md bg-white/10 px-2 py-1"
                >
                  {audioTracks.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">URL do manifesto HLS (.m3u8)</p>
          <p className="mt-1 text-xs text-muted">
            Para abrir em VLC, ffmpeg/ffplay ou qualquer analisador HLS.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={absoluteM3u8}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md bg-black/40 px-3 py-2 font-mono text-xs"
            />
            <button
              onClick={copy}
              className="shrink-0 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
