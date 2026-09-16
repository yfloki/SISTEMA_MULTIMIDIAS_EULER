'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Title, ProgressEntry, LiveStatus } from '@aurora/shared';
import { getTitles, getProgress, getMyList, getLiveStatus } from './api';
import { useProfile } from './profile';

export interface HomeRow { key: string; label: string; titles: Title[] }

export function buildRows(titles: Title[], progress: ProgressEntry[], myList: string[]): HomeRow[] {
  const rows: HomeRow[] = [];
  const byId = new Map(titles.map((t) => [t.id, t]));

  const cont = progress
    .filter((p) => p.positionS > 0 && (p.durationS === 0 || p.positionS / p.durationS < 0.95))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => byId.get(p.titleId))
    .filter((t): t is Title => !!t);
  if (cont.length) rows.push({ key: 'continue', label: 'Continuar assistindo', titles: cont });

  const list = myList.map((id) => byId.get(id)).filter((t): t is Title => !!t);
  if (list.length) rows.push({ key: 'mylist', label: 'Minha lista', titles: list });

  const genres = [...new Set(titles.flatMap((t) => t.genres))].sort((a, b) => a.localeCompare(b));
  for (const g of genres) {
    const gt = titles.filter((t) => t.genres.includes(g));
    if (gt.length) rows.push({ key: `genre:${g}`, label: g, titles: gt });
  }
  return rows;
}

export function useHomeData() {
  const { profile } = useProfile();
  const [titles, setTitles] = useState<Title[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [myList, setMyList] = useState<string[]>([]);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMyList = useCallback(() => {
    if (profile) getMyList(profile.id).then(setMyList).catch(() => {});
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getTitles(), getProgress(profile.id), getMyList(profile.id), getLiveStatus()])
      .then(([t, p, l, lv]) => { setTitles(t); setProgress(p); setMyList(l); setLive(lv); })
      .catch(() => {})
      .finally(() => setLoading(false));
    const id = setInterval(() => getLiveStatus().then(setLive).catch(() => {}), 10000);
    return () => clearInterval(id);
  }, [profile]);

  return { titles, progress, myList, live, loading, refreshMyList };
}
