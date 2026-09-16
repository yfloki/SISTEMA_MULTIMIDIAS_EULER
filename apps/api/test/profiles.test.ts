import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { openTestDb, type Db } from '../src/db';
import { requireAuth } from '../src/auth';
import { createAuthRouter } from '../src/routes/auth';
import { createProfilesRouter } from '../src/routes/profiles';

let db: Db; let app: express.Express;

function makeAgent() {
  return request.agent(app);
}

beforeAll(async () => {
  db = await openTestDb();
  await db.query(`INSERT INTO titles (id, slug, name) VALUES ('t1','t1','Filme')`);
  app = express().use(cookieParser()).use(express.json())
    .use('/api/auth', createAuthRouter(db))
    .use('/api/profiles', requireAuth, createProfilesRouter(db));
});

describe('perfis (autenticados por usuário)', () => {
  it('sem login retorna 401', async () => {
    expect((await request(app).get('/api/profiles')).status).toBe(401);
  });

  it('cria e lista perfis do próprio usuário', async () => {
    const agent = makeAgent();
    await agent.post('/api/auth/register')
      .send({ name: 'Leo', email: 'p1@teste.com', password: 'segredo1' });
    const created = await agent.post('/api/profiles').send({ name: 'Leo', avatar: 'red' });
    expect(created.status).toBe(201);
    const list = await agent.get('/api/profiles');
    expect(list.body).toHaveLength(1);

    // outro usuário não vê os perfis do primeiro
    const other = makeAgent();
    await other.post('/api/auth/register')
      .send({ name: 'X', email: 'p2@teste.com', password: 'segredo1' });
    expect((await other.get('/api/profiles')).body).toHaveLength(0);
  });

  it('salva e lê progresso (upsert)', async () => {
    const agent = makeAgent();
    await agent.post('/api/auth/register')
      .send({ name: 'A', email: 'p3@teste.com', password: 'segredo1' });
    const p = (await agent.post('/api/profiles').send({ name: 'A', avatar: 'red' })).body;
    await agent.put(`/api/profiles/${p.id}/progress/t1`).send({ positionS: 30, durationS: 600 });
    await agent.put(`/api/profiles/${p.id}/progress/t1`).send({ positionS: 95, durationS: 600 });
    const res = await agent.get(`/api/profiles/${p.id}/progress`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].positionS).toBe(95);
    expect(res.body[0].titleId).toBe('t1');
  });

  it('minha lista: adiciona, lista e remove', async () => {
    const agent = makeAgent();
    await agent.post('/api/auth/register')
      .send({ name: 'B', email: 'p4@teste.com', password: 'segredo1' });
    const p = (await agent.post('/api/profiles').send({ name: 'B', avatar: 'red' })).body;
    await agent.put(`/api/profiles/${p.id}/list/t1`);
    expect((await agent.get(`/api/profiles/${p.id}/list`)).body).toEqual(['t1']);
    await agent.delete(`/api/profiles/${p.id}/list/t1`);
    expect((await agent.get(`/api/profiles/${p.id}/list`)).body).toEqual([]);
  });

  it('não mexe em perfil de outro usuário (404)', async () => {
    const a = makeAgent();
    await a.post('/api/auth/register')
      .send({ name: 'A', email: 'p5@teste.com', password: 'segredo1' });
    const p = (await a.post('/api/profiles').send({ name: 'A', avatar: 'red' })).body;
    const b = makeAgent();
    await b.post('/api/auth/register')
      .send({ name: 'B', email: 'p6@teste.com', password: 'segredo1' });
    expect((await b.get(`/api/profiles/${p.id}/progress`)).status).toBe(404);
  });
});
