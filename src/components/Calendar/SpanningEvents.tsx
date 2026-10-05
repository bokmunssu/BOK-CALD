import { format } from 'date-fns';
import type { Event } from '../../types';
import type { EventSpan } from '../../utils/eventSpans';
import styles from './SpanningEvents.module.scss';
export default function SpanningEvents({spans, onClick}: {spans: EventSpan[]; onClick:(event:Event)=>void}) {
  return <div className={styles.bars} style={{gridTemplateRows:`repeat(${Math.max(1,...spans.map(s=>s.lane+1))}, 22px)`}}>
    {spans.map(s=><button key={s.event.id} type="button" className={styles.bar} data-span-id={s.event.id} data-span-start={s.start} data-span-end={s.end} aria-label={`${s.event.title} ${format(new Date(s.event.date),'M/d')}~${format(new Date(s.event.endDate!),'M/d')}`} title={`${s.event.title} · ${format(new Date(s.event.date),'M/d')}~${format(new Date(s.event.endDate!),'M/d')}`} style={{gridColumn:`${s.start+1} / ${s.end+2}`,gridRow:s.lane+1,borderLeftColor:s.event.color,backgroundColor:`color-mix(in srgb, ${s.event.color} 25%, var(--color-surface))`,borderTopLeftRadius:s.continuesBefore?0:4,borderBottomLeftRadius:s.continuesBefore?0:4,borderTopRightRadius:s.continuesAfter?0:4,borderBottomRightRadius:s.continuesAfter?0:4}} onClick={e=>{e.stopPropagation();onClick(s.event);}}>
      {s.continuesBefore && <span>‹</span>}<span className={styles.title}>{s.event.title}</span>{s.continuesAfter && <span>›</span>}
    </button>)}
  </div>;
}
