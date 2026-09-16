'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '@/lib/profile';
import { logout } from '@/lib/api';
import { AvatarBadge } from './AvatarBadge';
import { SearchBox } from './SearchBox';

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/#mylist', label: 'Minha lista' },
  { href: '/admin', label: 'Estúdio' },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, clear } = useProfile();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // como a Netflix: transparente sobre o hero, escurece ao rolar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const sair = async () => {
    await logout().catch(() => {});
    clear();
    router.push('/login');
  };

  const isActive = (href: string) =>
    href === '/admin' ? pathname.startsWith('/admin') : href === '/' && pathname === '/';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex items-center gap-8 px-8 py-3 transition-colors duration-300
        ${scrolled
          ? 'bg-bg/95 shadow-lg shadow-black/30 backdrop-blur-md'
          : 'bg-gradient-to-b from-black/70 to-transparent'}`}
    >
      <Link href="/" className="shrink-0">
        <img src="/logo.png" alt="AURORA+" className="h-8 w-auto" />
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors
              ${isActive(l.href) ? 'bg-white/15 font-semibold text-fg' : 'text-muted hover:text-fg'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-4">
        <SearchBox />
        {profile && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5"
              aria-label="Menu do perfil"
            >
              <AvatarBadge avatar={profile.avatar} name={profile.name} size={34} />
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden
                className={`size-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="glass absolute right-0 top-11 min-w-44 rounded-lg p-2 text-sm">
                <Link href="/profiles" className="block rounded px-3 py-2 hover:bg-white/10">
                  Trocar perfil
                </Link>
                <button onClick={sair}
                  className="block w-full rounded px-3 py-2 text-left hover:bg-white/10">
                  Sair da AURORA+
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
