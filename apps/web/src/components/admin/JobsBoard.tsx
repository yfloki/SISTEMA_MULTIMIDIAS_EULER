'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Job } from '@aurora/shared';
import { getJobs } from '@/lib/api';
import { API_URL } from '@/lib/config';

const STATUS_LABEL: Record<Job['status'], string> = {
  pending: 'Na fila', running: 'Transcodificando', done: 'Concluído', error: 'Erro',
};

export function JobsBoard({ refreshSignal }: { refreshSignal: number }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(() => { getJobs().then(setJobs).catch(() => {}); }, []);

  useEffect(() => { refresh(); }, [refresh, refreshSignal]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/jobs/all/events`);
    es.onmessage = (ev) => {
      const job: Job = JSON.parse(ev.data);
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx === -1) return [job, ...prev];
        const next = [...prev];
        next[idx] = job;
        return next;
      });
    };
    return () => es.close();
  }, []);

  const retry = async (id: string) => {
    await fetch(`${API_URL}/api/jobs/${id}/retry`, { method: 'POST' });
    refresh();
  };

  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display mb-4 text-xl font-bold">Fila de transcodificação</h2>
      {jobs.length === 0 && <p className="text-muted">Nenhum job ainda — envie um vídeo acima.</p>}
      <ul className="flex flex-col gap-3">
        {jobs.map((j) => (
          <li key={j.id} className="rounded-xl bg-surface2 p-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{j.titleName}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-bold
                ${j.status === 'done' ? 'bg-emerald-500/20 text-emerald-300'
                : j.status === 'error' ? 'bg-red-500/20 text-red-300'
                : j.status === 'running' ? 'bg-(--accent)/25 text-fg'
                : 'bg-white/10 text-muted'}`}>
                {STATUS_LABEL[j.status]}
              </span>
              <span className="ml-auto text-sm text-muted">{Math.round(j.progress)}%</span>
            </div>
            {(j.status === 'running' || j.status === 'pending') && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-(--accent) to-(--accent2) transition-all"
                  style={{ width: `${j.progress}%` }} />
              </div>
            )}
            {j.status === 'error' && (
              <div className="mt-2 text-sm">
                <button onClick={() => setExpanded(expanded === j.id ? null : j.id)}
                  className="text-muted underline">
                  {expanded === j.id ? 'esconder log' : 'ver log de erro'}
                </button>
                <button onClick={() => retry(j.id)}
                  className="ml-4 rounded bg-white/10 px-3 py-1 font-semibold">
                  Tentar de novo
                </button>
                {expanded === j.id && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/50 p-3 text-xs text-red-200">
                    {j.error}
                  </pre>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
