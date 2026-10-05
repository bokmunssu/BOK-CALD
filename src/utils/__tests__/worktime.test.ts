import { describe, expect, it } from 'vitest';
import { recordWorkTime, activeTarget, formatDuration } from '../worktime';
const target = { id: 'a', label: '작업', target: { processName: 'editor', title: '', mode: 'program' as const }, days: {} };
describe('foreground work recording', () => {
  it('records only a selected active program while running', () => {
    const state = { running: true, targets: [target] };
    expect(recordWorkTime(state, 500, { processName: 'other', title: '' })).toBe(state);
    expect(recordWorkTime({ ...state, running: false }, 500, { processName: 'editor', title: '' }).targets[0].days).toEqual({});
    expect(recordWorkTime(state, 500, { processName: 'editor', title: '' }, new Date(2026, 9, 5, 12)).targets[0].days).toEqual({ '2026-10-05': 500 });
    expect(recordWorkTime(state, 5000, { processName: 'editor', title: '' })).toBe(state);
  });
  it('splits midnight and prefers the exact tab without double counting', () => {
    const specific = { ...target, id: 'b', target: { ...target.target, mode: 'title' as const, title: '문서' } };
    const state = { running: true, targets: [target, specific] };
    expect(activeTarget(state.targets, { processName: 'editor', title: '문서' })?.id).toBe('b');
    const next = recordWorkTime(state, 500, { processName: 'editor', title: '문서' }, new Date(2026, 9, 6, 0, 0, 0, 250));
    expect(next.targets[0].days).toEqual({});
    expect(next.targets[1].days).toEqual({ '2026-10-05': 250, '2026-10-06': 250 });
  });
  it('formats long sessions without wrapping at 24 hours', () => expect(formatDuration(90061000)).toBe('25:01:01'));
});
