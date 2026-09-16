export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL ?? 'http://localhost:4001';

/** Converte um path relativo do catálogo ('hls/x/master.m3u8') em URL absoluta no media server. */
export function mediaUrl(path: string | null): string {
  if (!path) return '';
  return `${MEDIA_URL}/${path}`;
}
