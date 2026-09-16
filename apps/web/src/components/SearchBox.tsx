'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) return;
    timer.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, router]);

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) {
          if (timer.current) clearTimeout(timer.current);
          router.push(`/search?q=${encodeURIComponent(value.trim())}`);
        }
      }}
      placeholder="Buscar títulos…"
      aria-label="Buscar títulos"
      className="w-40 rounded-lg bg-surface2 px-3 py-1.5 text-sm outline-none transition-all
        focus:w-64 focus:ring-2 focus:ring-(--accent)"
    />
  );
}
