import { describe, it, expect } from 'vitest';
import { parseThumbsVtt, findThumbCue } from './ThumbStrip';

const VTT = `WEBVTT

00:00:00.000 --> 00:00:10.000
sprite_0.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
sprite_0.jpg#xywh=160,0,160,90

00:00:20.000 --> 00:00:30.000
sprite_0.jpg#xywh=0,90,160,90
`;

describe('parseThumbsVtt', () => {
  it('extrai cues com coordenadas xywh', () => {
    const cues = parseThumbsVtt(VTT);
    expect(cues).toHaveLength(3);
    expect(cues[0]).toEqual({ start: 0, end: 10, sprite: 'sprite_0.jpg', x: 0, y: 0, w: 160, h: 90 });
    expect(cues[1].x).toBe(160);
    expect(cues[2].y).toBe(90);
  });

  it('lê timestamps HH:MM:SS.mmm', () => {
    const vtt = 'WEBVTT\n\n01:02:03.500 --> 01:02:13.500\nsprite_1.jpg#xywh=320,0,160,90\n';
    const cues = parseThumbsVtt(vtt);
    expect(cues[0].start).toBeCloseTo(3723.5);
    expect(cues[0].sprite).toBe('sprite_1.jpg');
  });

  it('ignora blocos sem linha de tempo ou sem xywh', () => {
    const vtt = 'WEBVTT\n\nNOTE algum comentário\n\n00:00:00.000 --> 00:00:05.000\nsprite_0.jpg\n';
    expect(parseThumbsVtt(vtt)).toHaveLength(0);
  });
});

describe('findThumbCue', () => {
  const cues = parseThumbsVtt(VTT);

  it('encontra o cue que contém o tempo', () => {
    expect(findThumbCue(cues, 15)?.x).toBe(160);
  });

  it('cai para o último cue antes do tempo quando passa do fim', () => {
    expect(findThumbCue(cues, 999)?.y).toBe(90);
  });

  it('cai para o primeiro cue quando o tempo é anterior ao início', () => {
    expect(findThumbCue(cues, -5)?.x).toBe(0);
  });

  it('retorna undefined para lista vazia', () => {
    expect(findThumbCue([], 10)).toBeUndefined();
  });
});
