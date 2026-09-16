// Gera uma faixa "dublada" pt-BR de demonstração para um título:
// narração TTS (voz do Windows) dos cues da legenda, mixada sobre o áudio
// original com volume reduzido (ducking). Saída: content/source/<slug>.dub.m4a
// Uso: node scripts/make-dub.mjs <slug>
// Depois rode: node scripts/process.mjs <slug> (apague content/hls/<slug> antes
// se quiser re-transcodificar com a nova faixa).
import { register } from 'tsx/esm/api';
register();

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MOVIES } from './movies.mjs';

const slug = process.argv[2];
if (!slug) { console.error('uso: node scripts/make-dub.mjs <slug>'); process.exit(1); }

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const movie = MOVIES.find((m) => m.slug === slug);
if (!movie) { console.error(`slug desconhecido: ${slug}`); process.exit(1); }

const urlPath = new URL(movie.url).pathname;
const ext = (urlPath.endsWith('.zip') ? path.extname(urlPath.slice(0, -4)) : path.extname(urlPath)) || '.mp4';
const src = path.join(root, 'content', 'source', `${slug}${ext}`);
const vttPath = path.join(root, 'apps', 'api', 'seed', 'subs', `${slug}.vtt`);
const outDub = path.join(root, 'content', 'source', `${slug}.dub.m4a`);
if (!fs.existsSync(src)) { console.error(`fonte não encontrada: ${src}`); process.exit(1); }
if (!fs.existsSync(vttPath)) { console.error(`legenda não encontrada: ${vttPath}`); process.exit(1); }

const { ffmpegPath } = await import('../apps/api/src/ffbin.ts');

// 1. parse dos cues do VTT (timestamp inicial + texto)
const vtt = fs.readFileSync(vttPath, 'utf8');
const cueRe = /(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> [^\n]+\n([^\n]+)/g;
const cues = [];
let m;
while ((m = cueRe.exec(vtt)) !== null) {
  const startMs = (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 + +m[4];
  const text = m[5].replace(/\([^)]*\)/g, '').trim(); // remove rubricas "(música...)"
  if (text) cues.push({ startMs, text });
}
if (!cues.length) { console.error('nenhum cue com fala na legenda'); process.exit(1); }
console.log(`${cues.length} cues para narrar`);

// 2. TTS via SAPI do Windows (voz pt-BR se instalada)
const tmpDir = path.join(root, 'content', 'source', `${slug}.dub.tmp`);
fs.mkdirSync(tmpDir, { recursive: true });
cues.forEach((cue, i) => {
  const wav = path.join(tmpDir, `cue_${i}.wav`);
  const psText = cue.text.replace(/'/g, "''");
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `
    Add-Type -AssemblyName System.Speech;
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'pt-*' } | Select-Object -First 1;
    if ($v) { $s.SelectVoice($v.VoiceInfo.Name) };
    $s.Rate = 0;
    $s.SetOutputToWaveFile('${wav.replace(/\\/g, '\\\\')}');
    $s.Speak('${psText}');
    $s.Dispose();
  `]);
  console.log(`  ✔ TTS cue ${i}: "${cue.text.slice(0, 40)}..."`);
});

// 3. mixagem: áudio original com ducking + narrações posicionadas no tempo
const inputs = ['-i', src];
cues.forEach((_, i) => inputs.push('-i', path.join(tmpDir, `cue_${i}.wav`)));
const chains = [
  `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.3[bg]`,
  ...cues.map((cue, i) =>
    `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.6,adelay=${cue.startMs}|${cue.startMs}[c${i}]`),
];
const mixInputs = ['[bg]', ...cues.map((_, i) => `[c${i}]`)].join('');
const filter = `${chains.join(';')};${mixInputs}amix=inputs=${cues.length + 1}:duration=first:normalize=0[out]`;

console.log('mixando faixa dublada (ffmpeg)...');
execFileSync(ffmpegPath, [
  '-y', ...inputs, '-filter_complex', filter,
  '-map', '[out]', '-c:a', 'aac', '-b:a', '128k', outDub,
], { stdio: ['ignore', 'ignore', 'inherit'] });

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`✔ faixa dublada gerada: ${outDub}`);
console.log(`Agora: Remove-Item -Recurse content\\hls\\${slug}; node scripts/process.mjs ${slug}`);
