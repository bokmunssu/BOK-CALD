import { describe, expect, it } from 'vitest';
import { koreanHolidayName, hasHolidayData } from '../holidays';
describe('offline Korean public holidays', () => {
  it('includes all three lunar-new-year days, substitutes, and the election day', () => {
    for (const day of [16,17,18]) expect(koreanHolidayName(new Date(2026,1,day))).toContain('설날');
    expect(koreanHolidayName(new Date(2026,2,2))).toContain('대체');
    expect(koreanHolidayName(new Date(2026,5,3))).toBeTruthy();
    expect(koreanHolidayName(new Date(2026,6,17))).toContain('제헌');
    expect(koreanHolidayName(new Date(2026,9,5))).toContain('대체');
    expect(koreanHolidayName(new Date(2026,5,8))).toBe('');
  });
  it('does not pretend unsupported future years are complete', () => {
    expect(hasHolidayData(2027)).toBe(true); expect(hasHolidayData(2050)).toBe(false);
  });
});
