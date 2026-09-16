'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Title } from '@aurora/shared';
import { getTitles } from '@/lib/api';
import { useProfile } from '@/lib/profile';
import { Header } from '@/components/Header';
import { TitleCard } from '@/components/TitleCard';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [results, setResults] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    getTitles({ query: q }).then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
  }, [q]);

  return (
    <main className="min-h-screen px-8 pb-16 pt-28">
      <h1 className="font-display mb-8 text-2xl font-bold">
        Resultados para &ldquo;<span className="text-gradient">{q}</span>&rdquo;
      </h1>
      {loading ? (
        <p className="text-muted">Buscando…</p>
      ) : results.length === 0 ? (
        <p className="text-muted">Nada encontrado para &ldquo;{q}&rdquo;. Tente outro termo.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {results.map((t) => <TitleCard key={t.id} title={t} />)}
        </div>
      )}
    </main>
  );
}

function SearchGate() {
  const router = useRouter();
  const { profile, ready } = useProfile();
  useEffect(() => { if (ready && !profile) router.replace('/profiles'); }, [ready, profile, router]);
  if (!ready || !profile) {
    return <main className="min-h-screen px-8 pt-28 text-muted">Carregando…</main>;
  }
  return (
    <>
      <Header />
      <SearchResults />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen px-8 pt-28 text-muted">Carregando…</main>}>
      <SearchGate />
    </Suspense>
  );
}
