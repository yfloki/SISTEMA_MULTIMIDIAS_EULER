import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { openTestDb, type Db } from '../src/db';
import { seedCatalog } from '../src/seed';
import { createPublicRouter } from '../src/routes/public';

const SEED = [
  {
    slug: 'sintel', name: 'Sintel', synopsis: 'Uma garota busca seu dragão...',
    year: 2010, genres: ['Fantasia'], cast: ['Halina Reijn'], rating: 8.4,
    durationS: 888, hlsPath: 'hls/sintel/master.m3u8',
    poster: 'images/sintel/poster.jpg', backdrop: null, thumbsVtt: null,
    subtitles: [{ lang: 'pt-BR', label: 'Português', path: 'hls/sintel/subs/pt-BR.vtt' }],
  },
  {
    // ainda transcodificando: não pode aparecer no preview público
    slug: 'em-processamento', name: 'Em processamento', synopsis: '', year: 2024,
    genres: [], cast: [], rating: 0, durationS: 0, hlsPath: null,
    poster: null, backdrop: null, thumbsVtt: null, subtitles: [],
  },
];

let app: express.Express;
beforeAll(async () => {
  const db: Db = await openTestDb();
  await seedCatalog(db, SEED as any);
  app = express().use(express.json()).use('/api/public', createPublicRouter(db));
});

describe('rotas públicas (sem auth)', () => {
  it('devolve metadado e caminho HLS por slug', async () => {
    const res = await request(app).get('/api/public/titles/sintel');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Sintel');
    expect(res.body.hlsPath).toBe('hls/sintel/master.m3u8');
    expect(res.body.subtitles[0].lang).toBe('pt-BR');
  });

  it('404 para slug inexistente ou título sem HLS pronto', async () => {
    expect((await request(app).get('/api/public/titles/nao-existe')).status).toBe(404);
    expect((await request(app).get('/api/public/titles/em-processamento')).status).toBe(404);
  });
});
