import { describe, it, expect } from 'vitest';
import { pushSample, sparklinePoints, cappingLevelFor } from './useHlsStats';

describe('pushSample', () => {
  it('mantém janela deslizante de no máximo 60 amostras', () => {
    let s: number[] = [];
    for (let i = 0; i < 70; i++) s = pushSample(s, i);
    expect(s).toHaveLength(60);
    expect(s[0]).toBe(10);
    expect(s[59]).toBe(69);
  });
});

describe('sparklinePoints', () => {
  it('gera pontos normalizados pelo máximo', () => {
    const pts = sparklinePoints([0, 50, 100], 100, 30);
    expect(pts.split(' ')).toHaveLength(3);
    expect(pts).toContain('100.0,0.0'); // valor máximo encosta no topo
  });
  it('vazio com menos de 2 amostras', () => {
    expect(sparklinePoints([5], 100, 30)).toBe('');
  });
});

describe('cappingLevelFor', () => {
  const levels = [
    { bitrate: 800_000 }, { bitrate: 1_500_000 }, { bitrate: 3_000_000 }, { bitrate: 5_000_000 },
  ];
  it('sem teto retorna -1 (sem cap)', () => {
    expect(cappingLevelFor(levels, null)).toBe(-1);
  });
  it('escolhe o maior nível que cabe no teto', () => {
    expect(cappingLevelFor(levels, 1_600_000)).toBe(1);
    expect(cappingLevelFor(levels, 5_000_000)).toBe(3);
  });
  it('teto abaixo de todos trava no mais leve', () => {
    expect(cappingLevelFor(levels, 100_000)).toBe(0);
  });
});
