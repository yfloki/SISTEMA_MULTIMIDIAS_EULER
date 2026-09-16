import { Router } from 'express';
import type { Db } from '../db';

/**
 * Endpoints públicos (sem auth) para a landing page:
 * apenas metadados de vitrine — nome, pôster e nota. Nada de conteúdo.
 */
export function createPublicRouter(db: Db) {
  const r = Router();

  r.get('/featured', async (_req, res) => {
    const result = await db.query(
      `SELECT id, name, poster, rating FROM titles
       WHERE status = 'ready' AND hls_path IS NOT NULL
       ORDER BY rating DESC LIMIT 10`);
    res.json(result.rows);
  });

  /**
   * Metadado por slug para a página /preview — link HLS aberto para avaliação
   * externa (ex.: professor puxando o .m3u8). Os arquivos em content/hls já são
   * públicos no media server; aqui só expomos o caminho, nunca o fonte original.
   */
  r.get('/titles/:slug', async (req, res) => {
    const result = await db.query(
      `SELECT name, synopsis, year, duration_s, poster, hls_path, subtitles
         FROM titles
        WHERE slug = $1 AND status = 'ready' AND hls_path IS NOT NULL`,
      [req.params.slug]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'não encontrado' });
    res.json({
      name: row.name,
      synopsis: row.synopsis,
      year: row.year,
      durationS: row.duration_s,
      poster: row.poster,
      hlsPath: row.hls_path,
      subtitles: JSON.parse(row.subtitles),
    });
  });

  return r;
}
