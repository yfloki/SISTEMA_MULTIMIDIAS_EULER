import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { openDb } from './db';
import { PATHS, ensureDirs } from './paths';
import { bootstrapSeed } from './bootstrap-seed';
import { requireAuth } from './auth';
import { createAuthRouter } from './routes/auth';
import { createPublicRouter } from './routes/public';
import { createTitlesRouter } from './routes/titles';
import { createProfilesRouter } from './routes/profiles';
import { createLiveManager } from './live';
import { createLiveRouter } from './routes/live';
import { createJobQueue } from './jobs';
import { createJobsRouter } from './routes/jobs';
import { createUploadRouter } from './routes/upload';
import { transcodeToHls, generateThumbnails, extractStills, probeDuration } from './transcode';

ensureDirs();
export const db = await openDb(path.join(PATHS.content, 'db', 'pg'));
await bootstrapSeed(db);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', createAuthRouter(db));
app.use('/api/public', createPublicRouter(db));
app.use('/api/titles', requireAuth, createTitlesRouter(db));
app.use('/api/profiles', requireAuth, createProfilesRouter(db));

const live = createLiveManager({ hlsDir: PATHS.hls });
live.start();
app.use('/api/live', requireAuth, createLiveRouter(live));

export const queue = createJobQueue(db, {
  transcode: transcodeToHls, thumbnails: generateThumbnails,
  stills: extractStills, probe: probeDuration,
  hlsDir: PATHS.hls, imagesDir: PATHS.images,
});
app.use('/api/jobs', requireAuth, createJobsRouter(db, queue));
app.use('/api/upload', requireAuth, createUploadRouter(db, queue, {
  sourceDir: PATHS.source,
  validate: probeDuration,
}));
setInterval(() => { void queue.tick(); }, 2000);

app.listen(4000, () => console.log('[api] http://localhost:4000'));
