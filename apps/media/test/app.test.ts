import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMediaApp } from '../src/app';

let app: ReturnType<typeof createMediaApp>;

beforeAll(() => {
  const dir = mkdtempSync(path.join(tmpdir(), 'aurora-media-'));
  mkdirSync(path.join(dir, 'hls', 'demo'), { recursive: true });
  writeFileSync(path.join(dir, 'hls', 'demo', 'master.m3u8'), '#EXTM3U\n');
  writeFileSync(path.join(dir, 'hls', 'demo', 'seg_000.ts'), Buffer.alloc(188));
  // Arquivos sensíveis que NÃO podem ser servidos publicamente.
  mkdirSync(path.join(dir, 'source'), { recursive: true });
  writeFileSync(path.join(dir, 'source', 'master.mov'), Buffer.alloc(64));
  mkdirSync(path.join(dir, 'db', 'pg'), { recursive: true });
  writeFileSync(path.join(dir, 'db', 'pg', 'PG_VERSION'), '16\n');
  app = createMediaApp(dir);
});

describe('media server', () => {
  it('serve m3u8 com no-cache e content-type HLS', async () => {
    const res = await request(app).get('/hls/demo/master.m3u8');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['content-type']).toContain('application/vnd.apple.mpegurl');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('serve segmento .ts imutável com Range', async () => {
    const res = await request(app).get('/hls/demo/seg_000.ts').set('Range', 'bytes=0-9');
    expect(res.status).toBe(206);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('404 para arquivo inexistente', async () => {
    const res = await request(app).get('/hls/nada.m3u8');
    expect(res.status).toBe(404);
  });

  it('NÃO serve masters originais (source/) nem o banco (db/)', async () => {
    expect((await request(app).get('/source/master.mov')).status).toBe(404);
    expect((await request(app).get('/db/pg/PG_VERSION')).status).toBe(404);
  });
});
