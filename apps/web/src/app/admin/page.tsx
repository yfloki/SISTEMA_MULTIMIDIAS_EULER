'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/profile';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { Header } from '@/components/Header';
import { UploadForm } from '@/components/admin/UploadForm';
import { JobsBoard } from '@/components/admin/JobsBoard';
import { LivePanel } from '@/components/admin/LivePanel';

export default function AdminPage() {
  const router = useRouter();
  const { checking } = useAuthGuard();
  const { profile, ready } = useProfile();
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => { if (ready && !profile) router.replace('/profiles'); }, [ready, profile, router]);
  if (checking || !ready || !profile) {
    return <main className="grid min-h-screen place-items-center text-muted">Carregando…</main>;
  }

  return (
    <main className="min-h-screen px-8 pb-16 pt-24">
      <Header />
      <h1 className="font-display mb-8 text-4xl font-extrabold">
        Estúdio <span className="text-gradient">AURORA+</span>
      </h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <UploadForm onDone={() => setRefreshSignal((n) => n + 1)} />
          <LivePanel />
        </div>
        <JobsBoard refreshSignal={refreshSignal} />
      </div>
    </main>
  );
}
