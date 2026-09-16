import { Router, type Response } from 'express';
import { nanoid } from 'nanoid';
import type { Db } from '../db';
import type { AuthedRequest } from '../auth';

/** Todas as rotas assumem requireAuth aplicado no mount (req.userId presente). */
export function createProfilesRouter(db: Db) {
  const r = Router();

  async function ownProfile(req: AuthedRequest, res: Response): Promise<boolean> {
    const found = await db.query(
      `SELECT 1 FROM profiles WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId],
    );
    if (!found.rows.length) {
      res.status(404).json({ error: 'perfil não encontrado' });
      return false;
    }
    return true;
  }

  r.get('/', async (req: AuthedRequest, res) => {
    const result = await db.query(
      `SELECT id, name, avatar FROM profiles WHERE user_id = $1 ORDER BY created_at`,
      [req.userId],
    );
    res.json(result.rows);
  });

  r.post('/', async (req: AuthedRequest, res) => {
    const { name, avatar } = req.body ?? {};
    if (!name || !avatar) return res.status(400).json({ error: 'name e avatar são obrigatórios' });
    const profile = { id: nanoid(10), name: String(name), avatar: String(avatar) };
    await db.query(
      `INSERT INTO profiles (id, user_id, name, avatar) VALUES ($1, $2, $3, $4)`,
      [profile.id, req.userId, profile.name, profile.avatar],
    );
    res.status(201).json(profile);
  });

  r.delete('/:id', async (req: AuthedRequest, res) => {
    if (!(await ownProfile(req, res))) return;
    await db.query(`DELETE FROM progress WHERE profile_id = $1`, [req.params.id]);
    await db.query(`DELETE FROM my_list WHERE profile_id = $1`, [req.params.id]);
    await db.query(`DELETE FROM profiles WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  });

  r.get('/:id/progress', async (req: AuthedRequest, res) => {
    if (!(await ownProfile(req, res))) return;
    const result = await db.query(
      `SELECT title_id, position_s, duration_s, updated_at FROM progress
       WHERE profile_id = $1 ORDER BY updated_at DESC`,
      [req.params.id],
    );
    res.json(result.rows.map((x) => ({
      titleId: x.title_id, positionS: x.position_s, durationS: x.duration_s,
      updatedAt: new Date(x.updated_at).toISOString(),
    })));
  });

  r.put('/:id/progress/:titleId', async (req: AuthedRequest, res) => {
    if (!(await ownProfile(req, res))) return;
    const { positionS, durationS } = req.body ?? {};
    if (typeof positionS !== 'number') return res.status(400).json({ error: 'positionS numérico obrigatório' });
    await db.query(
      `INSERT INTO progress (profile_id, title_id, position_s, duration_s, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (profile_id, title_id) DO UPDATE SET
         position_s = EXCLUDED.position_s, duration_s = EXCLUDED.duration_s, updated_at = now()`,
      [req.params.id, req.params.titleId, positionS, durationS ?? 0],
    );
    res.status(204).end();
  });

  r.get('/:id/list', async (req: AuthedRequest, res) => {
    if (!(await ownProfile(req, res))) return;
    const result = await db.query(
      `SELECT title_id FROM my_list WHERE profile_id = $1 ORDER BY added_at DESC`,
      [req.params.id],
    );
    res.json(result.rows.map((x) => x.title_id));
  });

  r.put('/:id/list/:titleId', async (req: AuthedRequest, res) => {
    if (!(await ownProfile(req, res))) return;
    await db.query(
      `INSERT INTO my_list (profile_id, title_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.titleId],
    );
    res.status(204).end();
  });

  r.delete('/:id/list/:titleId', async (req: AuthedRequest, res) => {
    if (!(await ownProfile(req, res))) return;
    await db.query(
      `DELETE FROM my_list WHERE profile_id = $1 AND title_id = $2`,
      [req.params.id, req.params.titleId],
    );
    res.status(204).end();
  });

  return r;
}
