'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Profile } from '@aurora/shared';
import { getProfiles, createProfile } from '@/lib/api';
import { useProfile } from '@/lib/profile';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { AvatarBadge, AVATAR_KEYS } from '@/components/AvatarBadge';

export default function ProfilesPage() {
  const router = useRouter();
  const { checking } = useAuthGuard();
  const { setProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_KEYS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checking) getProfiles().then(setProfiles).catch(() => {});
  }, [checking]);

  const pick = (p: Profile) => { setProfile(p); router.push('/'); };

  if (checking) {
    return <main className="grid min-h-screen place-items-center text-muted">Carregando…</main>;
  }

  return (
    <main className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="font-display mb-12 text-4xl font-bold">Quem está assistindo?</h1>
        <div className="flex flex-wrap items-start justify-center gap-8">
          {profiles.map((p, i) => (
            <motion.button key={p.id} onClick={() => pick(p)}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.08 }}
              className="group flex flex-col items-center gap-3">
              <div className="rounded-2xl transition group-hover:glow">
                <AvatarBadge avatar={p.avatar} name={p.name} />
              </div>
              <span className="text-muted group-hover:text-fg">{p.name}</span>
            </motion.button>
          ))}
          <motion.button onClick={() => setCreating(true)} whileHover={{ scale: 1.08 }}
            className="flex flex-col items-center gap-3">
            <div className="grid size-24 place-items-center rounded-2xl border-2 border-dashed
              border-(--muted) text-4xl text-muted">+</div>
            <span className="text-muted">Novo perfil</span>
          </motion.button>
        </div>

        {creating && (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass mx-auto mt-12 flex max-w-md flex-col gap-4 rounded-2xl p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              try {
                const p = await createProfile(name.trim(), avatar);
                pick(p);
              } catch {
                setError('API ainda não está no ar — os agentes estão terminando essa parte.');
              }
            }}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nome do perfil" maxLength={20}
              className="rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
            <div className="flex justify-center gap-2">
              {AVATAR_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => setAvatar(k)}
                  className={avatar === k ? 'rounded-xl ring-2 ring-(--accent)' : ''}>
                  <AvatarBadge avatar={k} name={name || 'A'} size={48} />
                </button>
              ))}
            </div>
            <button type="submit"
              className="rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) py-3 font-semibold">
              Criar e entrar
            </button>
            {error && <p className="text-sm text-amber-400">{error}</p>}
          </motion.form>
        )}
      </div>
    </main>
  );
}
