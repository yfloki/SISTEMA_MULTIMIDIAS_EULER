import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './db';
import { seedCatalog, type SeedEntry } from './seed';
import { PATHS } from './paths';

/**
 * Semeia o catálogo na subida da API a partir de apps/api/seed/titles.json.
 * Campos de mídia (hls/poster/backdrop/thumbs) só entram quando o arquivo
 * correspondente já existe em content/ — antes do setup terminar, os títulos
 * aparecem no catálogo com cards em gradiente (sem imagens quebradas).
 */
export async function bootstrapSeed(db: Db): Promise<void> {
  const file = path.resolve(process.cwd(), 'seed', 'titles.json');
  if (!fs.existsSync(file)) return;
  const entries = JSON.parse(
    fs.readFileSync(file, 'utf8').replace(/^﻿/, '')) as SeedEntry[];
  const inContent = (rel: string | null) =>
    rel && fs.existsSync(path.join(PATHS.content, rel)) ? rel : null;
  await seedCatalog(db, entries.map((e) => ({
    ...e,
    hlsPath: inContent(e.hlsPath),
    poster: inContent(e.poster),
    backdrop: inContent(e.backdrop),
    thumbsVtt: inContent(e.thumbsVtt),
    subtitles: e.subtitles.filter((s) => inContent(s.path)),
  })));
}
