import path from 'node:path';
import fs from 'node:fs';

const content = path.resolve(process.cwd(), process.env.CONTENT_DIR ?? '../../content');

export const PATHS = {
  content,
  source: path.join(content, 'source'),
  hls: path.join(content, 'hls'),
  images: path.join(content, 'images'),
  db: path.join(content, 'db', 'app.db'),
};

export function ensureDirs() {
  for (const p of [PATHS.source, PATHS.hls, PATHS.images, path.dirname(PATHS.db)]) {
    fs.mkdirSync(p, { recursive: true });
  }
}
