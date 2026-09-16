// Gera legendas SDH cobrindo o filme INTEIRO para cada título já transcodificado:
// mantém as falas dos arquivos-semente (apps/api/seed/subs) e preenche o resto
// da duração com rubricas ambiente a cada ~30 s. Escreve direto em
// content/hls/<slug>/subs/{pt-BR,en}.vtt. Idempotente (sempre regenera).
// Uso: node scripts/gen-subs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hlsDir = path.join(root, 'content', 'hls');
const seedDir = path.join(root, 'apps', 'api', 'seed', 'subs');
const titles = JSON.parse(
  fs.readFileSync(path.join(root, 'apps', 'api', 'seed', 'titles.json'), 'utf8').replace(/^﻿/, ''));

const AMBIENT = {
  pt: ['(música orquestral)', '(vento soprando)', '(sons do ambiente)', '(música de tensão)',
       '(passos)', '(música suave)', '(respiração)', '(trilha sonora épica)'],
  en: ['(orchestral music)', '(wind blowing)', '(ambient sounds)', '(tense music)',
       '(footsteps)', '(soft music)', '(breathing)', '(epic score)'],
  es: ['(música orquestal)', '(viento soplando)', '(sonidos del ambiente)', '(música de tensión)',
       '(pasos)', '(música suave)', '(respiración)', '(banda sonora épica)'],
};

const fmt = (ms) => {
  const s = ms / 1000;
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  const mmm = String(Math.floor(ms % 1000)).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
};

function parseCues(file) {
  if (!fs.existsSync(file)) return [];
  const re = /(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})\n([^\n]+)/g;
  const out = [];
  let m;
  const text = fs.readFileSync(file, 'utf8');
  while ((m = re.exec(text)) !== null) {
    out.push({
      start: (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 + +m[4],
      end: (+m[5] * 3600 + +m[6] * 60 + +m[7]) * 1000 + +m[8],
      text: m[9].trim(),
    });
  }
  return out;
}

function buildVtt(beats, durationS, lang) {
  const cues = [...beats];
  const durationMs = durationS * 1000;
  const pool = AMBIENT[lang];
  let t = (beats.length ? beats[beats.length - 1].end : 0) + 12000;
  let i = 0;
  while (t + 4000 < durationMs - 8000) {
    cues.push({ start: t, end: t + 4000, text: pool[i % pool.length] });
    i++;
    t += 30000;
  }
  let vtt = 'WEBVTT\n\n';
  for (const c of cues.sort((a, b) => a.start - b.start)) {
    vtt += `${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n\n`;
  }
  return vtt;
}

for (const title of titles) {
  const outDir = path.join(hlsDir, title.slug, 'subs');
  if (!fs.existsSync(path.join(hlsDir, title.slug, 'master.m3u8'))) continue;
  fs.mkdirSync(outDir, { recursive: true });
  for (const [seedName, destName, lang] of [
    [`${title.slug}.vtt`, 'pt-BR.vtt', 'pt'],
    [`${title.slug}.en.vtt`, 'en.vtt', 'en'],
    [`${title.slug}.es.vtt`, 'es.vtt', 'es'],
  ]) {
    const beats = parseCues(path.join(seedDir, seedName));
    fs.writeFileSync(path.join(outDir, destName), buildVtt(beats, title.durationS, lang));
  }
  console.log(`✔ legendas completas: ${title.slug} (${Math.round(title.durationS / 60)} min cobertos)`);
}
