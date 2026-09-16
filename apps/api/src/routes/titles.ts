import { Router } from 'express';
import type { Db } from '../db';
import { rowToTitle } from '../mappers';

export function createTitlesRouter(db: Db) {
  const r = Router();

  r.get('/', async (req, res) => {
    const { query, genre } = req.query as { query?: string; genre?: string };
    const result = await db.query(`SELECT * FROM titles ORDER BY created_at DESC`);
    let rows = result.rows;
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (t) => t.name.toLowerCase().includes(q) || t.synopsis.toLowerCase().includes(q),
      );
    }
    if (genre) rows = rows.filter((t) => JSON.parse(t.genres).includes(genre));
    res.json(rows.map(rowToTitle));
  });

  r.get('/:id', async (req, res) => {
    const result = await db.query(`SELECT * FROM titles WHERE id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'título não encontrado' });
    res.json(rowToTitle(result.rows[0]));
  });

  return r;
}
