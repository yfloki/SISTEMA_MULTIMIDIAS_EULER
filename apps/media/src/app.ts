import express from 'express';
import path from 'node:path';

// Só estas subpastas de content/ são públicas. `source/` (masters originais)
// e `db/` (banco) NUNCA são servidos: montar por allowlist evita expô-los.
const PUBLIC_DIRS = ['hls', 'images'] as const;

export function createMediaApp(contentDir: string) {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });
  const opts = {
    acceptRanges: true,
    fallthrough: true,
    setHeaders(res: express.Response, filePath: string) {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (filePath.endsWith('.ts')) res.setHeader('Content-Type', 'video/mp2t');
      }
    },
  };
  for (const dir of PUBLIC_DIRS) {
    app.use(`/${dir}`, express.static(path.join(contentDir, dir), opts));
  }
  return app;
}
