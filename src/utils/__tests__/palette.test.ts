import { expect, it } from 'vitest';
import { recommendPalettes, contrast } from '../palette';
it('preserves the chosen primary and offers readable light and dark palettes', () => {
  for (const color of ['#000000','#ffffff','#ff0088','#66bbcc','#ffff00']) {
    const palettes = recommendPalettes(color);
    expect(palettes).toHaveLength(2);
    for (const { colors } of palettes) {
      expect(colors.primary).toBe(color);
      expect(contrast(colors.text,colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.textSecondary,colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(Object.values(colors).every(c => /^#[\da-f]{6}$/i.test(c))).toBe(true);
    }
  }
  expect(recommendPalettes('bad')).toEqual([]);
});
