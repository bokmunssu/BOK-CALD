import { describe,it,expect } from 'vitest';
import { isHolidayCalendar } from '../googleCalendar';
describe('holiday subscription separation',()=>{it('excludes provider holiday calendars without matching user titles',()=>{expect(isHolidayCalendar('ko.south_korea#holiday@group.v.calendar.google.com')).toBe(true);expect(isHolidayCalendar('birthday@group.calendar.google.com')).toBe(false);expect(isHolidayCalendar('공휴일')).toBe(false);});});
