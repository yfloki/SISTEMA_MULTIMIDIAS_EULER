import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { openTestDb, type Db } from '../src/db';
import { seedCatalog } from '../src/seed';
import { createTitlesRouter } from '../src/routes/titles';

const SEED = [
  {
    slug: 'big-buck-bunny', name: 'Big Buck Bunny', synopsis: 'Um coelho gigante...',
    year: 2008, genres: ['Animação', 'Comédia'], cast: ['Blender Institute'],
    rating: 8.1, durationS: 596, hlsPath: 'hls/big-buck-bunny/master.m3u8',
    poster: 'images/big-buck-bunny/poster.jpg', backdrop: 'images/big-buck-bunny/backdrop.jpg',
    thumbsVtt: null, subtitles: []
  },
  {
    slug: 'sintel', name: 'Sintel', synopsis: 'Uma garota busca seu dragão...',
    year: 2010, genres: ['Fantasia', 'Aventura'], cast: ['Halina Reijn'],
    rating: 8.4, durationS: 888, hlsPath: 'hls/sintel/master.m3u8',
    poster: null, backdrop: null, thumbsVtt: null, subtitles: []
  }
];

let db: Db; let app: express.Express;
beforeAll(async () => {
  db = await openTestDb();
  await seedCatalog(db, SEED as any);
  app = express().use(express.json()).use('/api/titles', createTitlesRouter(db));
});

describe('catálogo', () => {
  it('lista títulos com genres como array', async () => {
    const res = await request(app).get('/api/titles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const bbb = res.body.find((t: any) => t.slug === 'big-buck-bunny');
    expect(bbb.genres).toContain('Animação');
    expect(bbb.cast).toContain('Blender Institute');
  });

  it('seed é idempotente (upsert por slug)', async () => {
    await seedCatalog(db, SEED as any);
    const n = (await db.query('SELECT COUNT(*)::int AS c FROM titles')).rows[0];
    expect(n.c).toBe(2);
  });

  it('busca por query (case-insensitive)', async () => {
    const res = await request(app).get('/api/titles?query=sintel');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Sintel');
  });

  it('filtra por gênero', async () => {
    const res = await request(app).get('/api/titles?genre=Fantasia');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe('sintel');
  });

  it('detalhe por id e 404', async () => {
    const list = await request(app).get('/api/titles');
    const id = list.body[0].id;
    expect((await request(app).get(`/api/titles/${id}`)).status).toBe(200);
    expect((await request(app).get('/api/titles/nao-existe')).status).toBe(404);
  });
});
