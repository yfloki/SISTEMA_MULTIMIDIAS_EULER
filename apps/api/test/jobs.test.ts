import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openTestDb, type Db } from '../src/db';
import { createJobQueue } from '../src/jobs';
import path from 'node:path';

function makeDeps(overrides: Partial<Record<string, any>> = {}) {
  return {
    transcode: vi.fn(async (_i: string, _o: string, opts: any) => { opts?.onProgress?.(50); }),
    thumbnails: vi.fn(async () => {}),
    stills: vi.fn(async () => {}),
    probe: vi.fn(async () => 300),
    hlsDir: path.join('C:', 'tmp', 'hls'),
    imagesDir: path.join('C:', 'tmp', 'images'),
    ...overrides,
  };
}

let db: Db;
beforeEach(async () => {
  db = await openTestDb();
  await db.query(
    `INSERT INTO titles (id, slug, name, status) VALUES ('t1','meu-filme','Meu Filme','processing')`);
});

describe('fila de jobs', () => {
  it('enqueue cria job pending', async () => {
    const q = createJobQueue(db, makeDeps() as any);
    const job = await q.enqueue({ titleId: 't1', titleName: 'Meu Filme', sourcePath: 'C:\\x.mp4' });
    expect(job.status).toBe('pending');
  });

  it('tick processa: running → done e publica o título', async () => {
    const q = createJobQueue(db, makeDeps() as any);
    await q.enqueue({ titleId: 't1', titleName: 'Meu Filme', sourcePath: 'C:\\x.mp4' });
    const seen: string[] = [];
    q.events.on('job', (j: any) => seen.push(j.status));
    await q.tick();
    const job = (await db.query(`SELECT * FROM jobs`)).rows[0];
    expect(job.status).toBe('done');
    expect(seen).toContain('running');
    const title = (await db.query(`SELECT * FROM titles WHERE id='t1'`)).rows[0];
    expect(title.status).toBe('ready');
    expect(title.hls_path).toBe('hls/meu-filme/master.m3u8');
    expect(title.duration_s).toBe(300);
  });

  it('falha do ffmpeg marca error com mensagem', async () => {
    const deps = makeDeps({ transcode: vi.fn(async () => { throw new Error('boom ffmpeg'); }) });
    const q = createJobQueue(db, deps as any);
    await q.enqueue({ titleId: 't1', titleName: 'Meu Filme', sourcePath: 'C:\\x.mp4' });
    await q.tick();
    const job = (await db.query(`SELECT * FROM jobs`)).rows[0];
    expect(job.status).toBe('error');
    expect(job.error).toContain('boom ffmpeg');
    const title = (await db.query(`SELECT status FROM titles WHERE id='t1'`)).rows[0];
    expect(title.status).toBe('error');
  });

  it('tick sem pending não faz nada', async () => {
    const deps = makeDeps();
    const q = createJobQueue(db, deps as any);
    await q.tick();
    expect(deps.transcode).not.toHaveBeenCalled();
  });
});
