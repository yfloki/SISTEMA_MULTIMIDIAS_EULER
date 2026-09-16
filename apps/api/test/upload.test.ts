import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openTestDb, type Db } from '../src/db';
import { createUploadRouter } from '../src/routes/upload';
import { slugify } from '../src/slug';

let db: Db; let app: express.Express; let enqueue: any;

beforeEach(async () => {
  db = await openTestDb();
  enqueue = vi.fn(async () => ({ id: 'j1', status: 'pending' }));
  const sourceDir = mkdtempSync(path.join(tmpdir(), 'aurora-up-'));
  const router = createUploadRouter(db, { enqueue } as any, {
    sourceDir,
    validate: vi.fn(async () => 120),
  });
  app = express().use('/api/upload', router);
});

describe('slugify', () => {
  it('normaliza acentos e espaços', () => {
    expect(slugify('Meu Filme Épico!')).toBe('meu-filme-epico');
  });
});

describe('upload', () => {
  it('aceita mp4, cria título processing e enfileira job', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('name', 'Meu Filme')
      .field('synopsis', 'Teste')
      .field('year', '2026')
      .field('genres', 'Ação,Drama')
      .attach('file', Buffer.from('fake-video'), 'video.mp4');
    expect(res.status).toBe(201);
    expect(res.body.title.status).toBe('processing');
    expect(res.body.title.genres).toEqual(['Ação', 'Drama']);
    expect(enqueue).toHaveBeenCalledOnce();
  });

  it('rejeita arquivo que o ffprobe não lê', async () => {
    const bad = createUploadRouter(db, { enqueue } as any, {
      sourceDir: mkdtempSync(path.join(tmpdir(), 'aurora-bad-')),
      validate: vi.fn(async () => { throw new Error('não é vídeo'); }),
    });
    const app2 = express().use('/api/upload', bad);
    const res = await request(app2)
      .post('/api/upload')
      .field('name', 'X')
      .attach('file', Buffer.from('lixo'), 'doc.mp4');
    expect(res.status).toBe(400);
  });

  it('sem arquivo retorna 400', async () => {
    const res = await request(app).post('/api/upload').field('name', 'X');
    expect(res.status).toBe(400);
  });
});
