'use client';
import { sparklinePoints, THROTTLE_PRESETS, type HlsStats } from './useHlsStats';

const fmtKbps = (bps: number) =>
  bps >= 1_000_000 ? `${(bps / 1_000_000).toFixed(1)} Mbps` : `${Math.round(bps / 1000)} kbps`;

export function StatsPanel({ stats, series, throttleBps, onThrottle }: {
  stats: HlsStats | null;
  series: number[];
  throttleBps: number | null;
  onThrottle: (bps: number | null) => void;
}) {
  return (
    <div className="glass absolute right-4 top-16 z-50 w-72 rounded-xl p-4 text-xs">
      <p className="font-display mb-3 text-sm font-bold">
        Stats <span className="text-gradient">for nerds</span>
      </p>
      {stats ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <dt className="text-muted">Modo</dt>
          <dd className="font-semibold">
            {stats.auto ? `Auto (ABR)` : 'Manual'}
          </dd>
          <dt className="text-muted">Qualidade</dt>
          <dd className="font-semibold">{stats.levelHeight ? `${stats.levelHeight}p` : '—'}</dd>
          <dt className="text-muted">Bitrate do nível</dt>
          <dd>{fmtKbps(stats.levelBitrate)}</dd>
          <dt className="text-muted">Banda estimada</dt>
          <dd>{fmtKbps(stats.bandwidth)}</dd>
          <dt className="text-muted">Buffer à frente</dt>
          <dd>{stats.bufferAheadS.toFixed(1)} s</dd>
          <dt className="text-muted">Frames perdidos</dt>
          <dd>{stats.droppedFrames}</dd>
        </dl>
      ) : (
        <p className="text-muted">Coletando métricas…</p>
      )}

      <div className="mt-3">
        <p className="mb-1 text-muted">Bitrate (últimos 60 s)</p>
        <svg viewBox="0 0 240 40" className="h-10 w-full">
          <polyline
            points={sparklinePoints(series, 240, 38)}
            fill="none"
            stroke="url(#statsGrad)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="statsGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-muted">Simular rede</label>
        <select
          value={throttleBps === null ? 'null' : String(throttleBps)}
          onChange={(e) => onThrottle(e.target.value === 'null' ? null : Number(e.target.value))}
          className="w-full rounded-lg bg-surface2 px-2 py-1.5 outline-none focus:ring-2 focus:ring-(--accent)"
        >
          {THROTTLE_PRESETS.map((p) => (
            <option key={p.label} value={p.bps === null ? 'null' : String(p.bps)}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-muted">
          Capa o ABR no teto escolhido — veja a qualidade descer degrau a degrau.
        </p>
      </div>
    </div>
  );
}
