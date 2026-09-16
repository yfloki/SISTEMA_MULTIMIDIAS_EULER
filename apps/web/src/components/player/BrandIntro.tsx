'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Vinheta de abertura antes do conteúdo (estilo Netflix/Prime).
 * Se existir /intro.mp4 em public/, toca o vídeo da marca; caso contrário,
 * anima a logo estática. Chama onDone ao terminar para liberar o filme.
 */
export function BrandIntro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetch('/intro.mp4', { method: 'HEAD' })
      .then((r) => setHasVideo(r.ok && (r.headers.get('content-type') ?? '').startsWith('video')))
      .catch(() => setHasVideo(false));
  }, []);

  // animação da logo estática: ~2,1s + fade de saída
  useEffect(() => {
    if (hasVideo !== false) return;
    const t1 = setTimeout(() => setLeaving(true), 2100);
    const t2 = setTimeout(onDone, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [hasVideo, onDone]);

  // vinheta em vídeo: tenta com som; se o navegador bloquear, toca mudo
  useEffect(() => {
    if (!hasVideo) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => onDone());
    });
  }, [hasVideo, onDone]);

  return (
    <div className={`absolute inset-0 z-50 grid place-items-center bg-black
      transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}>
      {hasVideo && (
        <video ref={videoRef} src="/intro.mp4" playsInline
          onEnded={onDone} onError={onDone} className="size-full object-contain" />
      )}
      {hasVideo === false && (
        <img src="/logo.png" alt="AURORA+"
          className="w-[min(60vw,560px)] mix-blend-screen"
          style={{ animation: 'brand-intro 2.1s cubic-bezier(0.16, 0.84, 0.44, 1) forwards' }} />
      )}
    </div>
  );
}
