import path from 'node:path';

/**
 * Camada PostgreSQL única:
 * - Produção/VPS: `DATABASE_URL` aponta para um Postgres real (pool do `pg`).
 * - Dev local/testes: PGlite (Postgres embutido via WASM) — mesmo dialeto SQL,
 *   sem servidor. Persistência em content/db/pg (ou memória nos testes).
 * Ambos expõem a mesma interface: query(text, params) -> { rows }.
 */
export interface Db {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  synopsis TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL DEFAULT 0,
  genres TEXT NOT NULL DEFAULT '[]',
  cast_list TEXT NOT NULL DEFAULT '[]',
  rating REAL NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'vod',
  status TEXT NOT NULL DEFAULT 'ready',
  hls_path TEXT,
  poster TEXT,
  backdrop TEXT,
  thumbs_vtt TEXT,
  subtitles TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS progress (
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  title_id TEXT NOT NULL REFERENCES titles(id),
  position_s REAL NOT NULL DEFAULT 0,
  duration_s REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, title_id)
);
CREATE TABLE IF NOT EXISTS my_list (
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  title_id TEXT NOT NULL REFERENCES titles(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, title_id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  title_name TEXT NOT NULL,
  source_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress REAL NOT NULL DEFAULT 0,
  log TEXT NOT NULL DEFAULT '',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export async function initSchema(db: Db): Promise<void> {
  for (const stmt of SCHEMA.split(';')) {
    const sql = stmt.trim();
    if (sql) await db.query(sql);
  }
}

/** Postgres real (DATABASE_URL) ou PGlite persistido em `dataDir`. */
export async function openDb(dataDir?: string): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await initSchema(pool);
    return pool;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = dataDir ? new PGlite(path.resolve(dataDir)) : new PGlite();
  await db.waitReady;
  await initSchema(db as unknown as Db);
  return db as unknown as Db;
}

/** Banco em memória para testes (PGlite sem persistência). */
export async function openTestDb(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.waitReady;
  await initSchema(db as unknown as Db);
  return db as unknown as Db;
}
