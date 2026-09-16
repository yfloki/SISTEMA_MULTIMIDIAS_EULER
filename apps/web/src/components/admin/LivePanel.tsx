'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { LiveStatus } from '@aurora/shared';
import { API_URL } from '@/lib/config';

interface RestreamState { enabled: boolean; url: string | null; running: boolean }
type FullStatus = LiveStatus & { restream?: RestreamState };

export function LivePanel() {
  const [status, setStatus] = useState<FullStatus | null>(null);
  const [ytKey, setYtKey] = useState('');
  const [ytEnabled, setYtEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  // host real da página (produção mostra o domínio público, dev mostra localhost)
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://localhost:1935/live');
  useEffect(() => {
    setRtmpUrl(`rtmp://${window.location.hostname}:1935/live`);
  }, []);

  const refresh = useCallback(() => {
    fetch(`${API_URL}/api/live/status`).then((r) => r.json()).then((s: FullStatus) => {
      setStatus(s);
      if (s.restream) setYtEnabled(s.restream.enabled);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const saveRestream = async (enabled: boolean) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { enabled };
      if (ytKey.trim()) body.youtubeKey = ytKey.trim();
      await fetch(`${API_URL}/api/live/restream`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setYtEnabled(enabled);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-xl font-bold">Transmissão ao vivo</h2>
        {status?.active
          ? <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold">● NO AR</span>
          : <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-muted">offline</span>}
        {status?.active && (
          <Link href="/watch/live" className="ml-auto text-sm font-semibold text-gradient">
            Assistir agora →
          </Link>
        )}
      </div>

      <div className="mb-6 rounded-xl bg-surface2 p-4 text-sm">
        <p className="mb-2 font-semibold">Como transmitir (OBS Studio):</p>
        <ol className="list-inside list-decimal space-y-1 text-muted">
          <li>Configurações → Transmissão → Serviço: <b className="text-fg">Personalizado</b></li>
          <li>
            Servidor: <code className="rounded bg-black/40 px-1.5 py-0.5 text-fg">{rtmpUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(rtmpUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs">
              {copied ? 'copiado!' : 'copiar'}
            </button>
          </li>
          <li>Chave de transmissão: <code className="rounded bg-black/40 px-1.5 py-0.5 text-fg">aula</code> (ou qualquer nome)</li>
          <li>Iniciar transmissão — o card “AO VIVO” aparece na home em segundos.</li>
        </ol>
      </div>

      <div className="rounded-xl bg-surface2 p-4 text-sm">
        <p className="mb-2 font-semibold">Retransmitir para o YouTube</p>
        <p className="mb-3 text-muted">
          Cole a chave de transmissão do YouTube (YouTube Studio → Transmitir ao vivo → Chave).
          Com o simulcast ligado, tudo que chega no ingest vai simultaneamente para a plataforma e para o YouTube.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={ytKey}
            onChange={(e) => setYtKey(e.target.value)}
            placeholder="chave do YouTube (xxxx-xxxx-xxxx-xxxx)"
            className="flex-1 rounded-lg bg-black/40 px-3 py-2 outline-none focus:ring-2 focus:ring-(--accent)"
          />
          <button
            onClick={() => saveRestream(!ytEnabled)}
            disabled={saving || (!ytEnabled && !ytKey.trim() && !status?.restream?.url)}
            className={`rounded-lg px-4 py-2 font-semibold disabled:opacity-40
              ${ytEnabled ? 'bg-red-600/80' : 'bg-gradient-to-r from-(--accent) to-(--accent2)'}`}
          >
            {ytEnabled ? 'Desligar simulcast' : 'Ligar simulcast'}
          </button>
        </div>
        {status?.restream && (
          <p className="mt-2 text-xs text-muted">
            Estado: {status.restream.enabled ? 'ligado' : 'desligado'}
            {status.restream.enabled && (status.restream.running
              ? ' · relay rodando → YouTube'
              : status.active ? ' · aguardando relay…' : ' · aguardando ingest para iniciar o relay')}
          </p>
        )}
      </div>
    </section>
  );
}
