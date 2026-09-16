import path from 'node:path';
import { createMediaApp } from './app';

const contentDir = path.resolve(process.cwd(), process.env.CONTENT_DIR ?? '../../content');
const port = 4001;
createMediaApp(contentDir).listen(port, () => {
  console.log(`[media] servindo ${contentDir} em http://localhost:${port}`);
});
