'use client';
import { useRef } from 'react';
import type { Title, ProgressEntry } from '@aurora/shared';
import { TitleCard } from './TitleCard';

export function Row({ label, titles, progress = [], id }:
  { label: string; titles: Title[]; progress?: ProgressEntry[]; id?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
  const progFor = (id: string) => progress.find((p) => p.titleId === id);
  return (
    <section id={id} className="group/row relative mb-10 scroll-mt-20">
      <h2 className="font-display mb-3 px-8 text-xl font-semibold">{label}</h2>
      <div ref={track}
        className="flex snap-x gap-3 overflow-x-auto px-8 pb-4 [scrollbar-width:none]">
        {titles.map((t) => <TitleCard key={t.id} title={t} progress={progFor(t.id)} />)}
      </div>
      <button onClick={() => scroll(-1)} aria-label="anterior"
        className="absolute left-0 top-1/2 z-30 hidden h-24 w-10 -translate-y-1/2 rounded-r-lg
          bg-black/60 text-2xl group-hover/row:block">‹</button>
      <button onClick={() => scroll(1)} aria-label="próximo"
        className="absolute right-0 top-1/2 z-30 hidden h-24 w-10 -translate-y-1/2 rounded-l-lg
          bg-black/60 text-2xl group-hover/row:block">›</button>
    </section>
  );
}
