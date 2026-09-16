'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Title, ProgressEntry } from '@aurora/shared';
import { getTitle, getProgress, getMyList, toggleMyList } from '@/lib/api';
import { useProfile } from '@/lib/profile';
import { mediaUrl } from '@/lib/config';
import { Header } from '@/components/Header';

function fmtDuration(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.round((totalS % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

function fmtMMSS(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function TitlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, ready } = useProfile();
  const [title, setTitle] = useState<Title | null>(null);
  const [progress, setProgress] = useState<ProgressEntry | undefined>();
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (ready && !profile) router.replace('/profiles'); }, [ready, profile, router]);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    Promise.all([getTitle(params.id as string), getProgress(profile.id), getMyList(profile.id)])
      .then(([t, prog, list]) => {
        setTitle(t);
        setProgress(prog.find((p) => p.titleId === t.id));
        setInList(list.includes(t.id));
      })
      .catch(() => setTitle(null))
      .finally(() => setLoading(false));
  }, [params.id, profile]);

  if (!ready || !profile || loading) {
    return <main className="grid min-h-screen place-items-center text-muted">Carregando…</main>;
  }

  if (!title) {
    return (
      <main className="grid min-h-screen place-items-center text-center">
        <div>
          <p className="mb-4 text-lg text-muted">Título não encontrado.</p>
          <Link href="/" className="glass rounded-lg px-6 py-3 font-semibold">Voltar para a home</Link>
        </div>
      </main>
    );
  }

  const resumable = !!progress && progress.positionS > 0
    && progress.durationS > 0 && progress.positionS / progress.durationS < 0.95;
  const watchable = !!title.hlsPath;

  return (
    <main className="min-h-screen pb-20">
      <Header />
      <section className="relative h-[56vh] w-full overflow-hidden">
        {title.backdrop ? (
          <img src={mediaUrl(title.backdrop)} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-(--accent)/40 via-(--bg) to-(--accent2)/25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-(--bg) via-transparent to-(--bg)/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-(--bg)/95 via-(--bg)/30 to-transparent" />
      </section>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 -mt-40 flex flex-col gap-8 px-8 md:flex-row"
      >
        <div className="w-48 shrink-0 overflow-hidden rounded-(--radius) shadow-2xl md:w-64">
          {title.poster ? (
            <img src={mediaUrl(title.poster)} alt={title.name} className="w-full object-cover" />
          ) : (
            <div className="grid aspect-[2/3] place-items-center bg-gradient-to-br from-(--accent) to-(--accent2) p-4 text-center font-display font-bold">
              {title.name}
            </div>
          )}
        </div>

        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">{title.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {title.year > 0 && <span>{title.year}</span>}
            {title.rating > 0 && <span>★ {title.rating.toFixed(1)}</span>}
            {title.durationS > 0 && <span>{fmtDuration(title.durationS)}</span>}
          </div>
          {title.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {title.genres.map((g) => (
                <span key={g} className="glass rounded-full px-3 py-1 text-xs">{g}</span>
              ))}
            </div>
          )}
          <p className="mt-6 text-fg/85">{title.synopsis}</p>
          {title.cast.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              <span className="text-fg/70">Elenco: </span>{title.cast.join(', ')}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {watchable ? (
              <Link
                href={`/watch/${title.id}`}
                className="glow rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) px-8 py-3 text-lg font-bold"
              >
                ▶ {resumable ? `Continuar de ${fmtMMSS(progress!.positionS)}` : 'Assistir'}
              </Link>
            ) : (
              <button
                disabled title="Disponível em breve"
                className="cursor-not-allowed rounded-lg bg-surface2 px-8 py-3 text-lg font-bold text-muted"
              >
                Disponível em breve
              </button>
            )}
            <button
              onClick={async () => {
                await toggleMyList(profile.id, title.id, inList);
                setInList((v) => !v);
              }}
              className="glass rounded-lg px-6 py-3 text-lg font-semibold"
            >
              {inList ? '✓ Na lista' : '+ Minha lista'}
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
