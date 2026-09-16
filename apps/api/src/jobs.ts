import { EventEmitter } from 'node:events';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { Db } from './db';
import type { Job } from '@aurora/shared';

interface Deps {
  transcode: (input: string, outDir: string, opts?: { onProgress?: (p: number) => void }) => Promise<void>;
  thumbnails: (input: string, outDir: string, mediaPrefix: string) => Promise<void>;
  stills: (input: string, outDir: string) => Promise<void>;
  probe: (input: string) => Promise<number>;
  hlsDir: string;
  imagesDir: string;
}

function rowToJob(row: any): Job {
  return {
    id: row.id, titleId: row.title_id, titleName: row.title_name,
    status: row.status, progress: row.progress, error: row.error,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function createJobQueue(db: Db, deps: Deps) {
  const events = new EventEmitter();
  events.setMaxListeners(100);
  let busy = false;

  async function update(id: string, fields: Record<string, unknown>) {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await db.query(
      `UPDATE jobs SET ${sets}, updated_at = now() WHERE id = $1`,
      [id, ...keys.map((k) => fields[k])],
    );
    const row = (await db.query(`SELECT * FROM jobs WHERE id = $1`, [id])).rows[0];
    events.emit('job', rowToJob(row));
  }

  async function enqueue(input: { titleId: string; titleName: string; sourcePath: string }): Promise<Job> {
    const id = nanoid(10);
    await db.query(
      `INSERT INTO jobs (id, title_id, title_name, source_path) VALUES ($1, $2, $3, $4)`,
      [id, input.titleId, input.titleName, input.sourcePath],
    );
    const job = rowToJob((await db.query(`SELECT * FROM jobs WHERE id = $1`, [id])).rows[0]);
    events.emit('job', job);
    return job;
  }

  async function tick(): Promise<void> {
    if (busy) return;
    const found = await db.query(
      `SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1`);
    const row = found.rows[0];
    if (!row) return;
    busy = true;
    try {
      await update(row.id, { status: 'running', progress: 0 });
      const title = (await db.query(`SELECT * FROM titles WHERE id = $1`, [row.title_id])).rows[0];
      const slug = title.slug;
      const outHls = path.join(deps.hlsDir, slug);
      const outImages = path.join(deps.imagesDir, slug);

      let lastPct = -1;
      await deps.transcode(row.source_path, outHls, {
        onProgress: (p) => {
          const pct = Math.round(p * 0.8);
          if (pct !== lastPct) { lastPct = pct; void update(row.id, { progress: pct }); }
        },
      });
      await update(row.id, { progress: 85 });
      await deps.thumbnails(row.source_path, path.join(outHls, 'thumbs'), `hls/${slug}/thumbs`);
      await update(row.id, { progress: 95 });
      await deps.stills(row.source_path, outImages);
      const duration = await deps.probe(row.source_path);

      await db.query(
        `UPDATE titles SET status='ready', hls_path=$1, poster=$2, backdrop=$3,
           thumbs_vtt=$4, duration_s=$5 WHERE id=$6`,
        [`hls/${slug}/master.m3u8`, `images/${slug}/poster.jpg`, `images/${slug}/backdrop.jpg`,
         `hls/${slug}/thumbs/thumbnails.vtt`, Math.round(duration), row.title_id],
      );
      await update(row.id, { status: 'done', progress: 100 });
    } catch (err: any) {
      await db.query(`UPDATE titles SET status='error' WHERE id=$1`, [row.title_id]);
      await update(row.id, { status: 'error', error: String(err?.message ?? err).slice(0, 8000) });
    } finally {
      busy = false;
    }
  }

  return { enqueue, tick, events };
}

export type JobQueue = ReturnType<typeof createJobQueue>;
