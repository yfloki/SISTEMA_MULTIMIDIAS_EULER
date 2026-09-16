'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Title } from '@aurora/shared';
import { getTitle, getProgress, getLiveStatus } from '@/lib/api';
import { useProfile } from '@/lib/profile';
import { Player } from '@/components/player/Player';

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, ready } = useProfile();
  const [title, setTitle] = useState<Title | null>(null);
  const [startPosition, setStartPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isLive = params.id === 'live';

  useEffect(() => { if (ready && !profile) router.replace('/profiles'); }, [ready, profile, router]);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setNotFound(false);

    if (isLive) {
      getLiveStatus()
        .then((live) => {
          if (!live.active || !live.hlsPath) { setNotFound(true); return; }
          setTitle({
            id: 'live', slug: 'live', name: `Transmissão: ${live.key ?? 'ao vivo'}`,
            synopsis: '', year: 0, genres: [], cast: [], rating: 0, durationS: 0,
            kind: 'live', status: 'ready', hlsPath: live.hlsPath, poster: null, backdrop: null,
            thumbsVtt: null, subtitles: [],
          });
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([getTitle(params.id as string), getProgress(profile.id)])
      .then(([t, progress]) => {
        setTitle(t);
        const p = progress.find((x) => x.titleId === t.id);
        if (p && p.durationS > 0 && p.positionS / p.durationS < 0.95) setStartPosition(p.positionS);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id, profile, isLive]);

  if (!ready || !profile || loading) {
    return <main className="grid min-h-screen place-items-center bg-bg text-muted">Carregando…</main>;
  }

  if (notFound || !title) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg text-center">
        <div>
          <p className="mb-4 text-lg text-muted">
            {isLive ? 'Não há transmissão ao vivo no momento.' : 'Não foi possível carregar este conteúdo.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) px-6 py-3 font-semibold"
          >
            Voltar para a home
          </button>
        </div>
      </main>
    );
  }

  return (
    <Player title={title} profileId={profile.id} startPositionS={isLive ? 0 : startPosition} isLive={isLive} />
  );
}
