'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { login, register } from '@/lib/api';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('mode') === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') await register(name, email, password);
      else await login(email, password);
      router.push('/profiles');
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-(--accent)/25 via-(--bg) to-(--accent2)/15" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="glass relative z-10 w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-1 flex justify-center">
          <img src="/logo.png" alt="AURORA+" className="h-16 w-auto" />
        </h1>
        <p className="mb-8 text-center text-sm text-muted">
          {mode === 'login' ? 'Bom te ver de novo.' : 'Crie sua conta para começar a assistir.'}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome" required maxLength={40}
              className="rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail" required autoComplete="email"
            className="rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Senha (mín. 6 caracteres)' : 'Senha'}
            required minLength={6}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="rounded-lg bg-surface2 px-4 py-3 outline-none focus:ring-2 focus:ring-(--accent)" />

          {error && <p className="text-sm text-amber-400">{error}</p>}

          <button type="submit" disabled={busy}
            className="glow rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) py-3 text-lg font-bold disabled:opacity-50">
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === 'login' ? (
            <>Novo por aqui?{' '}
              <button onClick={() => { setMode('register'); setError(null); }}
                className="font-semibold text-fg underline">Crie uma conta</button></>
          ) : (
            <>Já tem conta?{' '}
              <button onClick={() => { setMode('login'); setError(null); }}
                className="font-semibold text-fg underline">Entrar</button></>
          )}
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-muted">Carregando…</main>}>
      <LoginInner />
    </Suspense>
  );
}
