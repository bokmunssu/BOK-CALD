import * as presets from '@hyunbinseo/holidays-kr/all';
import { localDay } from './worktime';

// Official-gazette presets are bundled for offline use, without an API key.
const holidays = Object.assign({}, ...Object.values(presets)) as Record<string, readonly string[]>;
export const holidayYears = Object.keys(presets).map(key => Number(key.slice(1))).sort();
export const koreanHolidayName = (date: Date) => holidays[localDay(date)]?.join(' · ') || '';
export const hasHolidayData = (year: number) => holidayYears.includes(year);
