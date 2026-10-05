export type WidgetKind = 'todo' | 'memo' | 'dday' | 'pomodoro' | 'worktime';
export interface WorkspaceSettings { simple: boolean; bannerVisible: boolean; bannerHeight: number; koreanHolidays: boolean }
export const normalizeSettings = (value: Partial<WorkspaceSettings> = {}): WorkspaceSettings => ({
  simple: typeof value.simple === 'boolean' ? value.simple : true,
  bannerVisible: typeof value.bannerVisible === 'boolean' ? value.bannerVisible : true,
  bannerHeight: Number.isFinite(value.bannerHeight) ? Math.max(40, Math.min(240, value.bannerHeight!)) : 100,
  koreanHolidays: value.koreanHolidays !== false,
});

// Apply only changed records to the latest main-process snapshot, so separate
// memo windows cannot overwrite unrelated edits using an older array.
export function mergeItems<T extends { id: string }>(current: T[], previous: T[], next: T[]): T[] {
  const before = new Map(previous.map(item => [item.id, item]));
  const after = new Map(next.map(item => [item.id, item]));
  const deleted = new Set(previous.filter(item => !after.has(item.id)).map(item => item.id));
  const changed = next.filter(item => JSON.stringify(before.get(item.id)) !== JSON.stringify(item));
  const changes = new Map(changed.map(item => [item.id, item]));
  const result = current.filter(item => !deleted.has(item.id)).map(item => changes.get(item.id) ?? item);
  const existing = new Set(result.map(item => item.id));
  return [...result, ...changed.filter(item => !existing.has(item.id))];
}

export interface ForegroundWindow { processName: string; title: string }
export interface FocusTarget extends ForegroundWindow { mode: 'program' | 'title' }
export interface TimerState {
  focusMinutes: number; breakMinutes: number; phase: 'focus' | 'break';
  remainingMs: number; running: boolean; gated: boolean; target: FocusTarget | null;
  sessions: number;
}
export const defaultTimer: TimerState = {
  focusMinutes: 25, breakMinutes: 5, phase: 'focus', remainingMs: 25 * 60000,
  running: false, gated: false, target: null, sessions: 0,
};
export function matchesTarget(target: FocusTarget | null, active: ForegroundWindow | null): boolean {
  return !!target && !!active && target.processName.toLowerCase() === active.processName.toLowerCase()
    && (target.mode === 'program' || (!!target.title && target.title === active.title));
}
export function advanceTimer(state: TimerState, elapsedMs: number, active: boolean): TimerState {
  if (!state.running || (state.phase === 'focus' && state.gated && !active)) return state;
  const remainingMs = state.remainingMs - Math.max(0, elapsedMs);
  if (remainingMs > 0) return { ...state, remainingMs };
  const phase = state.phase === 'focus' ? 'break' : 'focus';
  return { ...state, phase, running: false,
    sessions: state.sessions + (state.phase === 'focus' ? 1 : 0),
    remainingMs: (phase === 'focus' ? state.focusMinutes : state.breakMinutes) * 60000 };
}
