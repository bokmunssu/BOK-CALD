import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const blob = vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }));
const query = vi.fn(async () => [{ family: 'Legacy Korean', fullName: 'Legacy Korean Regular', postscriptName: 'LegacyKorean-Regular', style: 'Regular', blob }]);
const sources: unknown[] = [];
let rejectNative = false;
class TestFace {
  constructor(public family: string, public source: unknown) { sources.push(source); }
  async load() { if (rejectNative && typeof this.source === 'string') throw new Error('Native unavailable'); return this; }
}
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); sources.length = 0; rejectNative = false;
  Object.defineProperty(window, 'queryLocalFonts', { value: query, configurable: true });
  Object.defineProperty(document, 'fonts', { value: { add: vi.fn() }, configurable: true });
  vi.stubGlobal('FontFace', TestFace);
});
afterEach(() => { vi.unstubAllGlobals(); delete (window as any).queryLocalFonts; });

it('resolves legacy installed names natively and shares enumeration and font loads', async () => {
  const fonts = await import('../localFonts');
  const first = fonts.resolveFont('Legacy Korean'); const second = fonts.resolveFont('Legacy Korean');
  expect(await first).toContain('TomoInstalled'); expect(await second).toBe(await first);
  await fonts.installedFonts();
  expect(query).toHaveBeenCalledTimes(1); expect(blob).not.toHaveBeenCalled();
  expect(sources[0]).toContain('Legacy Korean Regular');
});
it('loads a file when the native name cannot be resolved', async () => {
  rejectNative = true;
  const fonts = await import('../localFonts');
  expect(await fonts.resolveFont('LegacyKorean-Regular')).toContain('TomoInstalled');
  expect(blob).toHaveBeenCalledTimes(1); expect(sources[1]).toBeInstanceOf(ArrayBuffer);
});
it('retains an unavailable requested family with Korean fallback and refreshes enumeration', async () => {
  const fonts = await import('../localFonts');
  expect(await fonts.resolveFont('Missing font')).toContain('"Missing font", "Malgun Gothic"');
  await fonts.installedFonts(true);
  expect(query).toHaveBeenCalledTimes(2);
});
