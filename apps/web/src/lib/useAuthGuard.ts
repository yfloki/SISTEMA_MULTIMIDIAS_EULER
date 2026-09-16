'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, type User } from './api';

/**
 * Verifica a sessão. Por padrão redireciona para /login quando deslogado;
 * com `redirect=false` apenas informa (para a home mostrar a landing).
 */
export function useAuthGuard(redirect: boolean = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => { if (redirect) router.replace('/login'); })
      .finally(() => setChecking(false));
  }, [router, redirect]);

  return { user, checking };
}
