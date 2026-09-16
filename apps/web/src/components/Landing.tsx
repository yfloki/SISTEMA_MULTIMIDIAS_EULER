'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { API_URL, mediaUrl } from '@/lib/config';

interface FeaturedTitle { id: string; name: string; poster: string | null; rating: number }

const FEATURES = [
  { icon: '📺', title: 'Streaming adaptativo de verdade',
    text: 'HLS com 4 qualidades que se ajustam à sua internet em tempo real — de 1080p a 360p sem travar.' },
  { icon: '🎧', title: 'Dublado, legendado, do seu jeito',
    text: 'Áudio em português e inglês, legendas em três idiomas. Troque no meio do filme, sem pausar.' },
  { icon: '🔴', title: 'Transmissões ao vivo',
    text: 'Lives via OBS direto na plataforma — com retransmissão simultânea para o YouTube.' },
  { icon: '👤', title: 'Perfis para todo mundo',
    text: 'Cada pessoa com sua lista, seu progresso e seu "continuar assistindo".' },
];

const FAQ = [
  { q: 'O que é o AURORA+?',
    a: 'Uma plataforma de streaming completa: catálogo de filmes abertos em alta qualidade, player adaptativo, múltiplos idiomas, perfis e transmissões ao vivo.' },
  { q: 'Quanto custa o AURORA+?',
    a: 'Nada. O AURORA+ é um projeto acadêmico da disciplina de Sistemas de Multimídia — crie sua conta e assista à vontade, sem limites.' },
  { q: 'Onde posso assistir?',
    a: 'Em qualquer navegador moderno, no computador ou no celular. É só entrar com a sua conta.' },
  { q: 'Como funciona a troca de qualidade?',
    a: 'O player mede sua banda em tempo real e escolhe a melhor qualidade automaticamente (ABR). Você também pode fixar a qualidade manualmente — e ver as métricas ao vivo apertando D.' },
  { q: 'Posso assistir dublado?',
    a: 'Sim. Os títulos têm áudio original em inglês e faixa dublada em português — e legendas em português, inglês e espanhol. Você troca tudo durante a reprodução.' },
  { q: 'Posso transmitir ao vivo?',
    a: 'Sim! Aponte o OBS para o nosso ingest RTMP e sua transmissão aparece na home de todos os usuários — com opção de simulcast para o YouTube.' },
];

function EmailCta({ email, setEmail, onSubmit }: {
  email: string; setEmail: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <p className="text-lg text-fg/90">
        Tudo pronto para assistir? Informe seu e-mail para criar sua conta.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="glass flex-1 rounded-lg px-5 py-4 text-lg outline-none focus:ring-2 focus:ring-(--accent)" />
        <button type="submit"
          className="glow rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) px-8 py-4 text-xl font-bold">
          Vamos lá ›
        </button>
      </form>
    </>
  );
}

export function Landing() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [trending, setTrending] = useState<FeaturedTitle[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/public/featured`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTrending)
      .catch(() => {});
  }, []);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/login?mode=register${email ? `&email=${encodeURIComponent(email)}` : ''}`);
  };

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* hero com colagem de pôsteres ao fundo */}
      <section className="relative flex min-h-[82vh] flex-col">
        {trending.length > 0 && (
          <div className="absolute inset-0 grid grid-cols-5 gap-2 opacity-25 blur-[2px]">
            {[...trending, ...trending].slice(0, 15).map((t, i) => (
              t.poster && (
                <img key={`${t.id}-${i}`} src={mediaUrl(t.poster)} alt=""
                  className="size-full object-cover" />
              )
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-(--bg)/80 via-(--bg)/60 to-(--bg)" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg)_90%)]" />

        <header className="relative z-10 flex items-center justify-between px-8 py-5 md:px-16">
          <img src="/logo.png" alt="AURORA+" className="h-12 w-auto" />
          <Link href="/login"
            className="rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) px-5 py-2 font-semibold">
            Entrar
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
            Filmes, ao vivo e muito mais, sem limites
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="mt-4 text-xl text-fg/85">
            Dublado ou legendado. Grátis. Cancele quando quiser (mas por quê?).
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }} className="mt-8 flex w-full flex-col items-center">
            <EmailCta email={email} setEmail={setEmail} onSubmit={start} />
          </motion.div>
        </div>

        {/* divisor curvo estilo Netflix, em gradiente aurora */}
        <div className="relative z-10 mt-auto">
          <div className="mx-auto h-24 w-[150%] -translate-x-[16.5%] rounded-[100%_100%_0_0]
            border-t-4 border-(--accent) bg-(--bg)
            [box-shadow:0_-12px_48px_-8px_color-mix(in_srgb,var(--accent)_55%,transparent)]" />
        </div>
      </section>

      {/* Em alta — Top 10 com numerões */}
      {trending.length > 0 && (
        <section className="mx-auto max-w-6xl px-8 py-10">
          <h2 className="font-display mb-6 text-3xl font-extrabold">Em alta</h2>
          <div className="flex gap-10 overflow-x-auto pb-6 [scrollbar-width:none]">
            {trending.map((t, i) => (
              <Link key={t.id} href="/login?mode=register"
                className="group relative shrink-0 pl-10">
                <span aria-hidden
                  className="font-display absolute -left-1 bottom-0 z-0 text-[7.5rem] font-extrabold leading-none
                    text-transparent [-webkit-text-stroke:3px_var(--muted)] transition
                    group-hover:[-webkit-text-stroke:3px_var(--accent)]">
                  {i + 1}
                </span>
                <div className="relative z-10 w-36 overflow-hidden rounded-(--radius) bg-surface transition group-hover:scale-105 group-hover:glow">
                  {t.poster ? (
                    <img src={mediaUrl(t.poster)} alt={t.name}
                      className="aspect-[2/3] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid aspect-[2/3] w-full place-items-center bg-gradient-to-br from-(--accent) to-(--accent2) p-2 text-center font-display font-bold">
                      {t.name}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Mais motivos */}
      <section className="mx-auto max-w-6xl px-8 py-10">
        <h2 className="font-display mb-6 text-3xl font-extrabold">Mais motivos para entrar</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-8">
              <div className="mb-3 text-4xl">{f.icon}</div>
              <h3 className="font-display mb-2 text-2xl font-bold">{f.title}</h3>
              <p className="text-muted">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-8 py-10">
        <h2 className="font-display mb-8 text-3xl font-extrabold">Perguntas frequentes</h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <div key={item.q} className="overflow-hidden rounded-xl bg-surface2">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left text-lg font-semibold hover:bg-white/5">
                {item.q}
                <span className={`text-2xl transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <p className="border-t border-white/10 px-6 py-5 text-fg/85">{item.a}</p>
              )}
            </div>
          ))}
        </div>

        {/* CTA repetido pós-FAQ, como na Netflix */}
        <div className="mt-12 flex flex-col items-center text-center">
          <EmailCta email={email} setEmail={setEmail} onSubmit={start} />
        </div>
      </section>

      <footer className="px-8 pb-10 pt-6 text-center text-sm text-muted">
        <p>AURORA+ · Projeto acadêmico de Sistemas de Multimídia</p>
        <p className="mt-1">Conteúdo: filmes abertos da Blender Foundation (CC-BY)</p>
      </footer>
    </main>
  );
}
