import { differenceInCalendarDays, startOfDay } from 'date-fns';
import type { Event } from '../types';
export const isMultiDayEvent = (event: Event) => !!event.endDate && differenceInCalendarDays(new Date(event.endDate), new Date(event.date)) > 0;
export interface EventSpan { event: Event; start: number; end: number; lane: number; continuesBefore: boolean; continuesAfter: boolean }
// One DOM bar spans consecutive date columns, including the grid's dividing lines.
export function layoutEventSpans(events: Event[], days: Date[]): EventSpan[] {
  if (!days.length) return [];
  const first = startOfDay(days[0]), last = startOfDay(days[days.length-1]);
  const candidates = events.filter(isMultiDayEvent).map(event => {
    const start = differenceInCalendarDays(new Date(event.date), first);
    const end = differenceInCalendarDays(new Date(event.endDate!), first);
    return {event, start: Math.max(0,start), end: Math.min(days.length-1,end), lane:0, continuesBefore:start<0, continuesAfter:end>differenceInCalendarDays(last,first)};
  }).filter(span=>span.start<=span.end).sort((a,b)=>a.start-b.start || b.end-a.end || a.event.id.localeCompare(b.event.id));
  const laneEnds: number[]=[];
  return candidates.map(span=>{
    let lane=laneEnds.findIndex(end=>end<span.start);if(lane<0)lane=laneEnds.length;
    laneEnds[lane]=span.end;return {...span,lane};
  });
}
