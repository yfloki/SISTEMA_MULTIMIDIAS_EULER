'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Hls from 'hls.js';
import { motion } from 'framer-motion';
import type { Title } from '@aurora/shared';
import { mediaUrl } from '@/lib/config';

export function Hero({ title, inList, onToggleList }:
  { title: Title; inList: boolean; onToggleList: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!title.hlsPath || !video || !Hls.isSupported()) return;
    let hls: Hls | undefined;
    const timer = setTimeout(() => {
      hls = new Hls({ maxBufferLength: 15 });
      hls.loadSource(mediaUrl(title.hlsPath));
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls!.currentLevel = 0; // trailer no hero usa a variante mais leve
        video.play().then(() => setPlaying(true)).catch(() => {});
      });
    }, 1200);
    return () => { clearTimeout(timer); hls?.destroy(); };
  }, [title]);

  return (
    <section className="relative h-[78vh] w-full overflow-hidden">
      {title.backdrop ? (
        <img src={mediaUrl(title.backdrop)} alt=""
          className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-(--accent)/40 via-(--bg) to-(--accent2)/25" />
      )}
      <video ref={videoRef} muted loop playsInline
        className={`absolute inset-0 size-full object-cover transition-opacity duration-1000
          ${playing ? 'opacity-100' : 'opacity-0'}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-(--bg) via-transparent to-(--bg)/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-(--bg)/90 via-transparent to-transparent" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }} className="absolute bottom-24 left-8 max-w-xl">
        <h1 className="font-display text-6xl font-extrabold drop-shadow-lg">{title.name}</h1>
        <p className="mt-3 line-clamp-3 text-lg text-fg/85">{title.synopsis}</p>
        <div className="mt-6 flex gap-3">
          <Link href={`/watch/${title.id}`}
            className="glow rounded-lg bg-gradient-to-r from-(--accent) to-(--accent2) px-8 py-3 text-lg font-bold">
            ▶ Assistir
          </Link>
          <button onClick={onToggleList}
            className="glass rounded-lg px-6 py-3 text-lg font-semibold">
            {inList ? '✓ Na lista' : '+ Minha lista'}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
