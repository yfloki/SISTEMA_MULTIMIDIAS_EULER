// Faixa dublada a partir de uma versão dublada JÁ EXISTENTE do mesmo filme
// (ex.: dublagem clássica de estúdio em domínio público no archive.org).
// Baixa o vídeo dublado (movie.dubUrl), estima o desalinhamento em relação ao
// corte original comparando os padrões de silêncio das duas trilhas, e extrai
// o áudio alinhado para content/source/<slug>.dub.m4a — que process.mjs
// muxa como segunda faixa do HLS (por).
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

function run(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).slice(-800)));
      else resolve({ stdout, stderr });
    });
  });
}

async function download(url, dest, attempt = 1) {
  const MAX = 4;
  if (fs.existsSync(dest)) { console.log(`  ✓ já baixado: ${path.basename(dest)}`); return; }
  console.log(`  ↓ baixando versão dublada: ${url}${attempt > 1 ? ` (tentativa ${attempt}/${MAX})` : ''}`);
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  } catch (err) {
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
      if (pct !== lastPct && pct % 10 === 0) { console.log(`    ${pct}%`); lastPct = pct; }
    }
  }
  file.end();
  await new Promise((r) => file.on('close', r));
  fs.renameSync(tmp, dest);
}

async function probeDuration(ffprobePath, file) {
  const { stdout } = await run(ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ]);
  return parseFloat(stdout.trim());
}

/** Inícios de silêncio (s) nos primeiros `windowS` segundos da trilha. */
async function silenceStarts(ffmpegPath, file, windowS) {
  const { stderr } = await run(ffmpegPath, [
    '-hide_banner', '-i', file, '-t', String(windowS), '-vn',
    '-af', 'silencedetect=noise=-30dB:d=0.6', '-f', 'null', '-',
  ]);
  return [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
}

/** Deslocamento (dub − original) mais recorrente entre pares de silêncios. */
function estimateOffset(origStarts, dubStarts) {
  const bin = (d) => Math.round(d * 4) / 4; // resolução de 0,25 s
  const count = new Map();
  for (const a of origStarts) {
    for (const b of dubStarts) {
      const d = b - a;
      if (d > -90 && d < 150) count.set(bin(d), (count.get(bin(d)) || 0) + 1);
    }
  }
  let best = null; let support = 0;
  for (const [d, c] of count) {
    const score = c + (count.get(d - 0.25) || 0) + (count.get(d + 0.25) || 0);
    if (score > support) { support = score; best = d; }
  }
  return { offset: best, support };
}

/**
 * Garante content/source/<slug>.dub.m4a para filmes com `dubUrl`.
 * Retorna o caminho do m4a, ou null se o filme não tem dublagem.
 */
export async function ensureDubTrack(movie, sourceDir, origSrc) {
  const out = path.join(sourceDir, `${movie.slug}.dub.m4a`);
  if (!movie.dubUrl) return fs.existsSync(out) ? out : null;

  const { ffmpegPath, ffprobePath } = await import('../apps/api/src/ffbin.ts');

  // valida m4a deixado por execuções anteriores — extração interrompida
  // deixa arquivo truncado (sem moov) que quebraria a transcodificação
  if (fs.existsSync(out)) {
    try {
      await probeDuration(ffprobePath, out);
      return out;
    } catch {
      console.warn(`  ⚠ ${path.basename(out)} corrompido (extração interrompida?) — regenerando`);
      fs.rmSync(out, { force: true });
    }
  }
  const dubExt = path.extname(new URL(movie.dubUrl).pathname) || '.mp4';
  const dubSrc = path.join(sourceDir, `${movie.slug}.dub-src${dubExt}`);
  await download(movie.dubUrl, dubSrc);

  const [origDur, dubDur] = await Promise.all([
    probeDuration(ffprobePath, origSrc),
    probeDuration(ffprobePath, dubSrc),
  ]);
  console.log(`  durações — original: ${origDur.toFixed(1)}s, dublado: ${dubDur.toFixed(1)}s`);

  console.log('  analisando alinhamento (padrões de silêncio)…');
  const [silO, silD] = await Promise.all([
    silenceStarts(ffmpegPath, origSrc, 900),
    silenceStarts(ffmpegPath, dubSrc, 990),
  ]);
  let { offset, support } = estimateOffset(silO, silD);
  if (offset === null || support < 5) {
    offset = Math.max(0, dubDur - origDur);
    console.warn(`  ⚠ silêncios insuficientes (suporte=${support}); usando diferença de duração: ${offset.toFixed(1)}s`);
  } else {
    console.log(`  deslocamento estimado: ${offset.toFixed(2)}s (suporte=${support})`);
  }

  const args = ['-y'];
  if (offset > 0) args.push('-ss', offset.toFixed(3));
  args.push('-i', dubSrc, '-vn', '-ac', '2');
  if (offset < 0) {
    const ms = Math.round(-offset * 1000);
    args.push('-af', `adelay=${ms}|${ms}`);
  }
  // grava em .part e renomeia — interrupção não deixa m4a truncado com nome final
  const tmpOut = out + '.part.m4a';
  args.push('-c:a', 'aac', '-b:a', '160k', '-t', String(Math.ceil(origDur + 1)), '-f', 'mp4', tmpOut);
  await run(ffmpegPath, args);
  fs.renameSync(tmpOut, out);

  const outDur = await probeDuration(ffprobePath, out);
  if (Math.abs(outDur - origDur) > 5) {
    console.warn(`  ⚠ faixa dublada ficou com ${outDur.toFixed(1)}s vs ${origDur.toFixed(1)}s do original — confira a sincronização assistindo alguns trechos`);
  }
  console.log(`  ✔ faixa dublada pronta: ${path.basename(out)}`);
  return out;
}
