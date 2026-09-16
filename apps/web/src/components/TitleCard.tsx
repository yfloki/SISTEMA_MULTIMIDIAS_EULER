'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Title, ProgressEntry } from '@aurora/shared';
import { mediaUrl } from '@/lib/config';

function fmtDur(s: number): string {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

const PANEL_W = 304; // w-76
const PANEL_H = 300; // estimado p/ clamp vertical

/** Painel de preview que abre ao pairar no card, como Netflix/Prime. */
function PreviewPanel({ title, pct, rect, onEnter, onLeave }: {
  title: Title; pct: number; rect: DOMRect;
  onEnter: () => void; onLeave: () => void;
}) {
  const left = Math.min(Math.max(rect.left + rect.width / 2 - PANEL_W / 2, 8),
    window.innerWidth - PANEL_W - 8);
  const top = Math.min(Math.max(rect.top + rect.height / 2 - PANEL_H / 2, 60),
    window.innerHeight - PANEL_H - 8);
  const genres = Array.isArray(title.genres) ? title.genres.slice(0, 3) : [];
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{ position: 'fixed', left, top, width: PANEL_W, zIndex: 60 }}
        className="overflow-hidden rounded-xl bg-surface shadow-2xl shadow-black/70 ring-1 ring-white/10"
      >
        <Link href={`/watch/${title.id}`} className="relative block aspect-video w-full bg-black">
          {(title.backdrop || title.poster) && (
            <img src={mediaUrl(title.backdrop ?? title.poster!)} alt=""
              className="size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <p className="font-display absolute bottom-2 left-3 right-3 text-base font-bold drop-shadow">
            {title.name}
          </p>
          {pct > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <div className="h-full bg-gradient-to-r from-(--accent) to-(--accent2)"
                style={{ width: `${pct}%` }} />
            </div>
          )}
        </Link>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2">
            <Link href={`/watch/${title.id}`} aria-label="Assistir"
              className="grid size-9 place-items-center rounded-full bg-fg text-black transition hover:scale-105">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 translate-x-px" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </Link>
            <Link href={`/title/${title.id}`} aria-label="Mais informações"
              className="grid size-9 place-items-center rounded-full border border-white/40 transition hover:border-white hover:scale-105">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </Link>
            <span className="ml-auto text-xs text-muted">
              {title.year || ''}{title.rating ? ` · ★ ${title.rating}` : ''}
              {title.durationS ? ` · ${fmtDur(title.durationS)}` : ''}
            </span>
          </div>
          {genres.length > 0 && (
            <p className="text-xs text-muted">{genres.join(' · ')}</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export function TitleCard({ title, progress, live = false }:
  { title: Title; progress?: ProgressEntry; live?: boolean }) {
  const pct = progress && progress.durationS > 0
    ? Math.min(100, (progress.positionS / progress.durationS) * 100) : 0;
  const href = live ? '/watch/live' : `/title/${title.id}`;

  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [preview, setPreview] = useState<DOMRect | null>(null);

  const enter = () => {
    if (live) return;
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      const r = cardRef.current?.getBoundingClientRect();
      if (r) setPreview(r);
    }, 550);
  };
  const leave = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setPreview(null), 120);
  };
  const keepOpen = () => clearTimeout(closeTimer.current);

  // rolar fecha o preview (posição fixa ancorada no card)
  useEffect(() => {
    if (!preview) return;
    const close = () => setPreview(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true } as EventListenerOptions);
  }, [preview]);

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  return (
    <motion.div ref={cardRef} whileHover={{ scale: 1.06, zIndex: 20 }} transition={{ duration: 0.18 }}
      onMouseEnter={enter} onMouseLeave={leave}
      className="relative w-40 shrink-0 snap-start">
      <Link href={href} className="group block overflow-hidden rounded-(--radius) bg-surface">
        <div className="aspect-[2/3] w-full">
          {title.poster ? (
            <img src={mediaUrl(title.poster)} alt={title.name}
              className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-(--accent) to-(--accent2) p-2 text-center font-display font-bold">
              {title.name}
            </div>
          )}
        </div>
        {live && (
          <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold">
            ● AO VIVO
          </span>
        )}
        {pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-gradient-to-r from-(--accent) to-(--accent2)"
              style={{ width: `${pct}%` }} />
          </div>
        )}
      </Link>
      {preview && (
        <PreviewPanel title={title} pct={pct} rect={preview}
          onEnter={keepOpen} onLeave={leave} />
      )}
    </motion.div>
  );
}
