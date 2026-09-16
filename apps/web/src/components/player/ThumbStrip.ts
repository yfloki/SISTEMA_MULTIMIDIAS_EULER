/** Parser puro do thumbnails.vtt gerado pelo FFmpeg (Task 6): cues com `#xywh=` apontando
 * para um recorte de um sprite. Sem dependências de DOM — testável isoladamente. */

export interface ThumbCue {
  start: number;
  end: number;
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':');
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) {
    h = Number(parts[0]);
    m = Number(parts[1]);
    s = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    m = Number(parts[0]);
    s = parseFloat(parts[1]);
  } else {
    s = parseFloat(parts[0]);
  }
  return h * 3600 + m * 60 + s;
}

export function parseThumbsVtt(text: string): ThumbCue[] {
  const cues: ThumbCue[] = [];
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;
    const [startStr, endStr] = lines[timeLineIdx].split('-->').map((s) => s.trim().split(' ')[0]);
    const imgLine = lines[timeLineIdx + 1];
    if (!imgLine) continue;
    const m = imgLine.match(/^(.+?)#xywh=(\d+),(\d+),(\d+),(\d+)$/);
    if (!m) continue;
    const [, sprite, x, y, w, h] = m;
    cues.push({
      start: parseTimestamp(startStr),
      end: parseTimestamp(endStr),
      sprite,
      x: Number(x),
      y: Number(y),
      w: Number(w),
      h: Number(h),
    });
  }
  return cues;
}

/** Cue ativo em `time`; se fora do intervalo coberto, cai para o cue mais próximo. */
export function findThumbCue(cues: ThumbCue[], time: number): ThumbCue | undefined {
  if (!cues.length) return undefined;
  const exact = cues.find((c) => time >= c.start && time < c.end);
  if (exact) return exact;
  let candidate = cues[0];
  for (const c of cues) {
    if (c.start <= time) candidate = c;
    else break;
  }
  return candidate;
}
