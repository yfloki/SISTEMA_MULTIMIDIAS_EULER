import { describe, it, expect, beforeAll } from 'vitest';
import { openTestDb, type Db } from '../src/db';

let db: Db;
beforeAll(async () => { db = await openTestDb(); });

describe('schema (postgres)', () => {
  it('cria todas as tabelas', async () => {
    const result = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    const names = result.rows.map((r: any) => r.table_name);
    for (const t of ['users', 'titles', 'profiles', 'progress', 'my_list', 'jobs']) {
      expect(names).toContain(t);
    }
  });

  it('progress tem PK composta (upsert substitui)', async () => {
    await db.query(`INSERT INTO users (id, email, name, password_hash) VALUES ('u1','a@a.com','A','x')`);
    await db.query(`INSERT INTO titles (id, slug, name) VALUES ('t1','t1','T')`);
    await db.query(`INSERT INTO profiles (id, user_id, name, avatar) VALUES ('p1','u1','Leo','red')`);
    const up = `INSERT INTO progress (profile_id, title_id, position_s, duration_s)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (profile_id, title_id) DO UPDATE SET position_s = EXCLUDED.position_s`;
    await db.query(up, ['p1', 't1', 10, 600]);
    await db.query(up, ['p1', 't1', 99, 600]);
    const rows = (await db.query(`SELECT * FROM progress`)).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].position_s).toBe(99);
  });
});
