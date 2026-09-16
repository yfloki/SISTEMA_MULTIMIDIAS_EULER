import { nanoid } from 'nanoid';
import type { Db } from './db';

export interface SeedEntry {
  slug: string; name: string; synopsis: string; year: number;
  genres: string[]; cast: string[]; rating: number; durationS: number;
  hlsPath: string | null; poster: string | null; backdrop: string | null;
  thumbsVtt: string | null; subtitles: { lang: string; label: string; path: string }[];
}

export async function seedCatalog(db: Db, entries: SeedEntry[]): Promise<void> {
  for (const e of entries) {
    await db.query(
      `INSERT INTO titles (id, slug, name, synopsis, year, genres, cast_list, rating,
         duration_s, kind, status, hls_path, poster, backdrop, thumbs_vtt, subtitles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'vod', 'ready', $10, $11, $12, $13, $14)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name, synopsis = EXCLUDED.synopsis, year = EXCLUDED.year,
         genres = EXCLUDED.genres, cast_list = EXCLUDED.cast_list, rating = EXCLUDED.rating,
         duration_s = EXCLUDED.duration_s, hls_path = EXCLUDED.hls_path,
         poster = EXCLUDED.poster, backdrop = EXCLUDED.backdrop,
         thumbs_vtt = EXCLUDED.thumbs_vtt, subtitles = EXCLUDED.subtitles`,
      [
        nanoid(10), e.slug, e.name, e.synopsis, e.year,
        JSON.stringify(e.genres), JSON.stringify(e.cast), e.rating, e.durationS,
        e.hlsPath, e.poster, e.backdrop, e.thumbsVtt, JSON.stringify(e.subtitles),
      ],
    );
  }
}
