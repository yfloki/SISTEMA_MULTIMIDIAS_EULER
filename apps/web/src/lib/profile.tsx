'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Profile } from '@aurora/shared';

const KEY = 'aurora.profile';
const Ctx = createContext<{
  profile: Profile | null; ready: boolean;
  setProfile: (p: Profile) => void; clear: () => void;
}>({ profile: null, ready: false, setProfile: () => {}, clear: () => {} });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, set] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) set(JSON.parse(raw));
    setReady(true);
  }, []);
  const setProfile = (p: Profile) => { localStorage.setItem(KEY, JSON.stringify(p)); set(p); };
  const clear = () => { localStorage.removeItem(KEY); set(null); };
  return <Ctx.Provider value={{ profile, ready, setProfile, clear }}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
