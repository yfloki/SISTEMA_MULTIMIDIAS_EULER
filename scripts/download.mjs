// Baixa apenas os filmes-fonte (sem transcodificar) — usado para adiantar
// os downloads enquanto o pipeline FFmpeg fica pronto. `npm run setup`
// reconhece os arquivos já baixados e pula direto para a transcodificação.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOVIES } from './movies.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = path.join(root, 'content', 'source');
fs.mkdirSync(sourceDir, { recursive: true });

async function download(url, dest, attempt = 1) {
  const MAX = 4;
  if (fs.existsSync(dest)) { console.log(`✓ já baixado: ${path.basename(dest)}`); return; }
  console.log(`↓ baixando ${url}${attempt > 1 ? ` (tentativa ${attempt}/${MAX})` : ''}`);
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  } catch (err) {
    // archive.org devolve 500/503 esporádicos — espera e tenta de novo
    if (attempt >= MAX) throw err;
    const waitS = attempt * 15;
    console.log(`  ⚠ ${err.message} — nova tentativa em ${waitS}s`);
    await new Promise((r) => setTimeout(r, waitS * 1000));
    return download(url, dest, attempt + 1);
  }
  const tmp = dest + '.part';
  const file = fs.createWriteStream(tmp);
  const total = Number(res.headers.get('content-length') ?? 0);
  let got = 0; let lastPct = -1;
  for await (const chunk of res.body) {
    file.write(chunk);
    got += chunk.length;
    if (total) {
      const pct = Math.floor((got / total) * 100);
      if (pct !== lastPct && pct % 10 === 0) { console.log(`  ${path.basename(dest)}: ${pct}%`); lastPct = pct; }
    }
  }
  file.end();
  await new Promise((r) => file.on('close', r));
  fs.renameSync(tmp, dest);
  console.log(`  ok: ${path.basename(dest)} (${(got / 1e6).toFixed(0)} MB)`);
}

async function unzip(zipPath, slug) {
  // extrai para pasta temporária e move o maior arquivo para source/<slug>.<ext>
  const { execFileSync } = await import('node:child_process');
  const tmpDir = zipPath + '.extract';
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', [
      '-NoProfile', '-Command',
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmpDir}' -Force`,
    ]);
  } else {
    fs.mkdirSync(tmpDir, { recursive: true });
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', tmpDir]);
  }
  const files = fs.readdirSync(tmpDir)
    .map((f) => ({ f, size: fs.statSync(path.join(tmpDir, f)).size }))
    .sort((a, b) => b.size - a.size);
  if (!files.length) throw new Error('zip vazio');
  const inner = files[0].f;
  const finalPath = path.join(sourceDir, `${slug}${path.extname(inner)}`);
  fs.renameSync(path.join(tmpDir, inner), finalPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });
  console.log(`  extraído: ${path.basename(finalPath)}`);
}

const failures = [];
for (const movie of MOVIES) {
  const urlPath = new URL(movie.url).pathname;
  const isZip = urlPath.endsWith('.zip');
  const ext = isZip
    ? path.extname(urlPath.slice(0, -4)) || '.mp4'
    : path.extname(urlPath) || '.mp4';
  const finalDest = path.join(sourceDir, `${movie.slug}${ext}`);
  if (fs.existsSync(finalDest)) { console.log(`✓ já baixado: ${path.basename(finalDest)}`); continue; }
  try {
    if (isZip) {
      const zipDest = path.join(sourceDir, `${movie.slug}.zip`);
      await download(movie.url, zipDest);
      await unzip(zipDest, movie.slug);
    } else {
      await download(movie.url, finalDest);
    }
  } catch (err) {
    console.error(`✗ falhou ${movie.slug}: ${err.message}`);
    failures.push(movie.slug);
  }
}
console.log(failures.length
  ? `Downloads concluídos com falhas: ${failures.join(', ')}`
  : 'Todos os downloads concluídos.');
