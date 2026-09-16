import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { openTestDb } from '../src/db';
import { createAuthRouter } from '../src/routes/auth';

let app: express.Express;
beforeAll(async () => {
  const db = await openTestDb();
  app = express().use(cookieParser()).use(express.json())
    .use('/api/auth', createAuthRouter(db));
});

describe('auth', () => {
  it('registra, recebe cookie e acessa /me', async () => {
    const agent = request.agent(app);
    const reg = await agent.post('/api/auth/register')
      .send({ name: 'Leo', email: 'leo@teste.com', password: 'segredo1' });
    expect(reg.status).toBe(201);
    expect(reg.headers['set-cookie']?.[0]).toContain('aurora_token');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('leo@teste.com');
  });

  it('e-mail duplicado retorna 409', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'A', email: 'dup@teste.com', password: 'segredo1' });
    const again = await request(app).post('/api/auth/register')
      .send({ name: 'B', email: 'dup@teste.com', password: 'segredo2' });
    expect(again.status).toBe(409);
  });

  it('login com senha errada retorna 401; certa retorna 200', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'C', email: 'c@teste.com', password: 'segredo1' });
    expect((await request(app).post('/api/auth/login')
      .send({ email: 'c@teste.com', password: 'errada0' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login')
      .send({ email: 'c@teste.com', password: 'segredo1' })).status).toBe(200);
  });

  it('/me sem cookie retorna 401; senha curta retorna 400', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).post('/api/auth/register')
      .send({ name: 'D', email: 'd@teste.com', password: '123' })).status).toBe(400);
  });
});
