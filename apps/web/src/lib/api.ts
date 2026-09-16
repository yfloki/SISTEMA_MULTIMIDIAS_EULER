import type { Title, Profile, ProgressEntry, Job, LiveStatus } from '@aurora/shared';
import { API_URL } from './config';

export function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v);
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `API ${res.status}`;
    try { message = (await res.json()).error ?? message; } catch { /* corpo não-JSON */ }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// cookies de sessão em todas as chamadas
const CRED: RequestInit = { credentials: 'include' };

export interface User { id: string; name: string; email: string }

export const register = (name: string, email: string, password: string) =>
  fetch(`${API_URL}/api/auth/register`, {
    ...CRED, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  }).then((r) => j<User>(r));
export const login = (email: string, password: string) =>
  fetch(`${API_URL}/api/auth/login`, {
    ...CRED, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => j<User>(r));
export const logout = () =>
  fetch(`${API_URL}/api/auth/logout`, { ...CRED, method: 'POST' });
export const getMe = () =>
  fetch(`${API_URL}/api/auth/me`, CRED).then((r) => j<User>(r));

export const getTitles = (p: { query?: string; genre?: string } = {}) =>
  fetch(`${API_URL}/api/titles${qs(p)}`, CRED).then((r) => j<Title[]>(r));
export const getTitle = (id: string) =>
  fetch(`${API_URL}/api/titles/${id}`, CRED).then((r) => j<Title>(r));
export const getProfiles = () =>
  fetch(`${API_URL}/api/profiles`, CRED).then((r) => j<Profile[]>(r));
export const createProfile = (name: string, avatar: string) =>
  fetch(`${API_URL}/api/profiles`, {
    ...CRED, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, avatar }),
  }).then((r) => j<Profile>(r));
export const getProgress = (profileId: string) =>
  fetch(`${API_URL}/api/profiles/${profileId}/progress`, CRED).then((r) => j<ProgressEntry[]>(r));
export const putProgress = (profileId: string, titleId: string, positionS: number, durationS: number) =>
  fetch(`${API_URL}/api/profiles/${profileId}/progress/${titleId}`, {
    ...CRED, method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionS, durationS }),
  });
export const getMyList = (profileId: string) =>
  fetch(`${API_URL}/api/profiles/${profileId}/list`, CRED).then((r) => j<string[]>(r));
export const toggleMyList = (profileId: string, titleId: string, inList: boolean) =>
  fetch(`${API_URL}/api/profiles/${profileId}/list/${titleId}`, {
    ...CRED, method: inList ? 'DELETE' : 'PUT',
  });
export const getJobs = () =>
  fetch(`${API_URL}/api/jobs`, CRED).then((r) => j<Job[]>(r));
export const getLiveStatus = () =>
  fetch(`${API_URL}/api/live/status`, CRED).then((r) => j<LiveStatus>(r));
export const uploadTitle = (form: FormData) =>
  fetch(`${API_URL}/api/upload`, { ...CRED, method: 'POST', body: form }).then((r) => j<{ title: Title }>(r));
