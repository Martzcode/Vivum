import { wrapLines } from './share-card';

const measure = (value: string) => value.length * 10;

describe('wrapLines', () => {
  it('wraps words without exceeding the width', () => {
    const lines = wrapLines('un deux trois quatre cinq', 100, measure);
    expect(lines.every(line => measure(line) <= 100)).toBe(true);
    expect(lines.join(' ')).toBe('un deux trois quatre cinq');
  });

  it('keeps a long word on its own line', () => {
    expect(wrapLines('supercalifragilistic ok', 50, measure)).toEqual([
      'supercalifragilistic',
      'ok',
    ]);
  });

  it('collapses whitespace and handles empty text', () => {
    expect(wrapLines('  a \n b  ', 100, measure)).toEqual(['a b']);
    expect(wrapLines('   ', 100, measure)).toEqual([]);
  });
});
