import { describe, it, expect } from 'vitest';
import { buildRows } from './useHomeData';

const t = (id: string, genres: string[], durationS = 600): any =>
  ({ id, name: id, genres, durationS, status: 'ready' });

describe('buildRows', () => {
  it('continuar assistindo exclui vistos até o fim e ordena por recência', () => {
    const rows = buildRows(
      [t('a', ['Drama']), t('b', ['Drama']), t('c', ['Ação'])],
      [
        { titleId: 'a', positionS: 300, durationS: 600, updatedAt: '2026-01-02' },
        { titleId: 'b', positionS: 590, durationS: 600, updatedAt: '2026-01-03' },
        { titleId: 'c', positionS: 60, durationS: 600, updatedAt: '2026-01-04' },
      ],
      [],
    );
    const cont = rows.find((r) => r.key === 'continue')!;
    expect(cont.titles.map((x: any) => x.id)).toEqual(['c', 'a']);
  });

  it('minha lista e gêneros aparecem quando não vazios', () => {
    const rows = buildRows([t('a', ['Drama'])], [], ['a']);
    expect(rows.find((r) => r.key === 'mylist')!.titles).toHaveLength(1);
    expect(rows.find((r) => r.key === 'genre:Drama')).toBeTruthy();
    expect(rows.find((r) => r.key === 'continue')).toBeUndefined();
  });
});
