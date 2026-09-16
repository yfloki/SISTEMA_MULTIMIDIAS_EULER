export type TitleKind = 'vod' | 'live';
export type TitleStatus = 'processing' | 'ready' | 'error';
export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface SubtitleTrack {
  lang: string;   // 'pt-BR'
  label: string;  // 'Português'
  path: string;   // caminho relativo ao media server, ex: 'hls/bbb/subs/pt-BR.vtt'
}

export interface Title {
  id: string;
  slug: string;
  name: string;
  synopsis: string;
  year: number;
  genres: string[];
  cast: string[];
  rating: number;      // 0–10
  durationS: number;
  kind: TitleKind;
  status: TitleStatus;
  hlsPath: string | null;      // ex: 'hls/bbb/master.m3u8'
  poster: string | null;       // ex: 'images/bbb/poster.jpg'
  backdrop: string | null;
  thumbsVtt: string | null;    // ex: 'hls/bbb/thumbs/thumbnails.vtt'
  subtitles: SubtitleTrack[];
}

export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji ou id de avatar, ex: 'red'
}

export interface ProgressEntry {
  titleId: string;
  positionS: number;
  durationS: number;
  updatedAt: string; // ISO
}

export interface Job {
  id: string;
  titleId: string;
  titleName: string;
  status: JobStatus;
  progress: number; // 0–100
  error: string | null;
  createdAt: string;
}

export interface LiveStatus {
  active: boolean;
  key: string | null;
  hlsPath: string | null;   // 'hls/live/<key>/index.m3u8' quando ativo
  startedAt: string | null;
}
