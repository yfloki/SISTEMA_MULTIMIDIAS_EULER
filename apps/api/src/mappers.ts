import type { Title } from '@aurora/shared';

export function rowToTitle(row: any): Title {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    synopsis: row.synopsis,
    year: row.year,
    genres: JSON.parse(row.genres),
    cast: JSON.parse(row.cast_list),
    rating: row.rating,
    durationS: row.duration_s,
    kind: row.kind,
    status: row.status,
    hlsPath: row.hls_path,
    poster: row.poster,
    backdrop: row.backdrop,
    thumbsVtt: row.thumbs_vtt,
    subtitles: JSON.parse(row.subtitles),
  };
}
