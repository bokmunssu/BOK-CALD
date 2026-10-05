import { describe, it, expect } from 'vitest';
import { advanceTimer, defaultTimer, matchesTarget, normalizeSettings, mergeItems } from '../workspace';

describe('compact workspace', () => {
  it('clamps banner height and preserves explicit visibility', () => {
    expect(normalizeSettings({ bannerHeight: 900, bannerVisible: false }).bannerHeight).toBe(240);
    expect(normalizeSettings({ bannerHeight: NaN }).bannerHeight).toBe(100);
    expect(normalizeSettings({ bannerVisible: false }).bannerVisible).toBe(false);
  });
  it('merges concurrent edits to different records without dropping either', () => {
    const old = [{ id: 'a', content: 'a' }, { id: 'b', content: 'b' }];
    const current = [{ id: 'a', content: 'edited elsewhere' }, old[1]];
    expect(mergeItems(current, old, [old[0], { id: 'b', content: 'local' }])).toEqual([
      current[0], { id: 'b', content: 'local' },
    ]);
    expect(mergeItems(current, old, [old[0]])).toEqual([current[0]]);
  });
});

describe('focus timer', () => {
  const target = { processName: 'chrome', title: 'Study', mode: 'title' as const };
  it('requires the configured process AND active tab title', () => {
    expect(matchesTarget(target, { processName: 'chrome', title: 'Study' })).toBe(true);
    expect(matchesTarget(target, { processName: 'chrome', title: 'Other' })).toBe(false);
    expect(matchesTarget(target, { processName: 'other', title: 'Study' })).toBe(false);
    expect(matchesTarget(target, null)).toBe(false);
  });
  it('program mode accepts changing titles', () => {
    expect(matchesTarget({ ...target, mode: 'program' }, { processName: 'CHROME', title: 'Other' })).toBe(true);
  });
  it('pauses while gated out and counts elapsed time when enabled', () => {
    const timer = { ...defaultTimer, running: true, gated: true, target };
    expect(advanceTimer(timer, 1000, false).remainingMs).toBe(timer.remainingMs);
    expect(advanceTimer(timer, 1250, true).remainingMs).toBe(timer.remainingMs - 1250);
    expect(advanceTimer({ ...timer, gated: false }, 1000, false).remainingMs).toBe(timer.remainingMs - 1000);
    expect(advanceTimer({ ...timer, running: false }, 1000, true)).toEqual({ ...timer, running: false });
  });
  it('completes focus once and waits for user to start the break', () => {
    const completed = advanceTimer({ ...defaultTimer, running: true, remainingMs: 500 }, 1000, true);
    expect(completed.phase).toBe('break');
    expect(completed.running).toBe(false);
    expect(completed.sessions).toBe(1);
    expect(completed.remainingMs).toBe(defaultTimer.breakMinutes * 60000);
  });
  it('break runs without foreground gating and returns to focus', () => {
    const result = advanceTimer({ ...defaultTimer, phase: 'break', gated: true, running: true, remainingMs: 100 }, 1000, false);
    expect(result.phase).toBe('focus');
    expect(result.sessions).toBe(0);
  });
});
