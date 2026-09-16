import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import type { Db } from '../db';
import { AUTH_COOKIE, requireAuth, signToken, type AuthedRequest } from '../auth';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 3600 * 1000,
};

export function createAuthRouter(db: Db) {
  const r = Router();

  r.post('/register', async (req, res) => {
    const { name, email, password } = req.body ?? {};
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'nome, e-mail e senha são obrigatórios' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'a senha precisa de pelo menos 6 caracteres' });
    }
    const normalized = String(email).trim().toLowerCase();
    const existing = await db.query(`SELECT 1 FROM users WHERE email = $1`, [normalized]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'já existe uma conta com esse e-mail' });
    }
    const id = nanoid(12);
    const hash = await bcrypt.hash(String(password), 10);
    await db.query(
      `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
      [id, normalized, String(name).trim(), hash],
    );
    res.cookie(AUTH_COOKIE, signToken(id), COOKIE_OPTS);
    res.status(201).json({ id, name: String(name).trim(), email: normalized });
  });

  r.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'e-mail e senha são obrigatórios' });
    const found = await db.query(
      `SELECT id, name, email, password_hash FROM users WHERE email = $1`,
      [String(email).trim().toLowerCase()],
    );
    const user = found.rows[0];
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ error: 'e-mail ou senha incorretos' });
    }
    res.cookie(AUTH_COOKIE, signToken(user.id), COOKIE_OPTS);
    res.json({ id: user.id, name: user.name, email: user.email });
  });

  r.post('/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE);
    res.status(204).end();
  });

  r.get('/me', requireAuth, async (req: AuthedRequest, res) => {
    const found = await db.query(`SELECT id, name, email FROM users WHERE id = $1`, [req.userId]);
    if (!found.rows.length) return res.status(401).json({ error: 'não autenticado' });
    res.json(found.rows[0]);
  });

  return r;
}
