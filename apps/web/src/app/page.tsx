'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/profile';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useHomeData, buildRows } from '@/lib/useHomeData';
import { toggleMyList } from '@/lib/api';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Row } from '@/components/Row';
import { TitleCard } from '@/components/TitleCard';
import { Landing } from '@/components/Landing';

export default function Home() {
  const router = useRouter();
  const { user, checking } = useAuthGuard(false);
  const { profile, ready } = useProfile();
  const { titles, progress, myList, live, loading, refreshMyList } = useHomeData();

  useEffect(() => {
    if (user && ready && !profile) router.replace('/profiles');
  }, [user, ready, profile, router]);

  if (checking) {
    return <main className="grid min-h-screen place-items-center text-muted">Carregando…</main>;
  }
  if (!user) return <Landing />;
  if (!ready || !profile || loading) {
    return <main className="grid min-h-screen place-items-center text-muted">Carregando…</main>;
  }

  const hero = titles.find((t) => t.status === 'ready' && t.backdrop) ?? titles[0];
  const rows = buildRows(titles.filter((t) => t.status === 'ready'), progress, myList);

  return (
    <main className="min-h-screen pb-16">
      <Header />
      {hero && (
        <Hero title={hero} inList={myList.includes(hero.id)}
          onToggleList={async () => {
            await toggleMyList(profile.id, hero.id, myList.includes(hero.id));
            refreshMyList();
          }} />
      )}
      {live?.active && (
        <section className="mb-10 px-8">
          <h2 className="font-display mb-3 text-xl font-semibold">🔴 Ao vivo agora</h2>
          <TitleCard live
            title={{ ...(hero ?? ({} as any)), id: 'live', name: `Transmissão: ${live.key}`,
              poster: null, hlsPath: live.hlsPath } as any} />
        </section>
      )}
      {rows.map((r) => <Row key={r.key} id={r.key} label={r.label} titles={r.titles} progress={progress} />)}
    </main>
  );
}
