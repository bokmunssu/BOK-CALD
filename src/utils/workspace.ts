export type WidgetKind = 'todo' | 'memo' | 'dday' | 'pomodoro' | 'worktime';
export interface CollectionPatch { updates: { id: string; fields: Record<string, unknown>; unset: string[] }[]; deleted: string[] }
export function collectionPatch<T extends { id: string }>(previous: T[], next: T[]): CollectionPatch {
  const before = new Map(previous.map(item => [item.id, item]));
  const ids = new Set(next.map(item => item.id));
  const updates: CollectionPatch['updates'] = [];
  for (const item of next) {
    const old = before.get(item.id) as unknown as Record<string, unknown> | undefined;
    const value = item as unknown as Record<string, unknown>;
    const fields: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const x = old?.[key], y = value[key];
      if (!old || !(x === y || (x instanceof Date && y instanceof Date && +x === +y))) fields[key] = y;
    }
    const unset = old ? Object.keys(old).filter(key => !(key in value)) : [];
    if (Object.keys(fields).length || unset.length) updates.push({ id: item.id, fields, unset });
  }
  return { updates, deleted: previous.filter(item => !ids.has(item.id)).map(item => item.id) };
}
export function applyCollectionPatch<T extends { id: string }>(current: T[], patch: CollectionPatch): T[] {
  const removed = new Set(patch.deleted);
  const changes = new Map(patch.updates.map(item => [item.id, item]));
  const result = current.filter(item => !removed.has(item.id)).map(item => {
    const change = changes.get(item.id); if (!change) return item;
    const next = { ...item, ...change.fields, id: item.id };
    for (const key of change.unset) if (key !== 'id') delete (next as Record<string, unknown>)[key];
    changes.delete(item.id); return next;
  });
  return [...result, ...[...changes.values()].filter(item => !removed.has(item.id)).map(item => ({ ...item.fields, id: item.id } as T))];
}
export interface WorkspaceSettings { simple: boolean; bannerVisible: boolean; bannerHeight: number; koreanHolidays: boolean; lunarVisible: boolean; multiDayDisplay: 'daily' | 'connected'; fontFamily: string }
export const normalizeSettings = (value: Partial<WorkspaceSettings> = {}): WorkspaceSettings => ({
  lunarVisible: value.lunarVisible === true,
  multiDayDisplay: value.multiDayDisplay === 'connected' ? 'connected' : 'daily',
  simple: typeof value.simple === 'boolean' ? value.simple : true,
  bannerVisible: typeof value.bannerVisible === 'boolean' ? value.bannerVisible : true,
  bannerHeight: Number.isFinite(value.bannerHeight) ? Math.max(40, Math.min(240, value.bannerHeight!)) : 100,
  koreanHolidays: value.koreanHolidays !== false,
  fontFamily: typeof value.fontFamily === 'string' ? value.fontFamily.slice(0, 200) : '',
});

// Apply only changed records to the latest main-process snapshot, so separate
// memo windows cannot overwrite unrelated edits using an older array.
export function mergeItems<T extends { id: string }>(current: T[], previous: T[], next: T[]): T[] {
  const before = new Map(previous.map(item => [item.id, item]));
  const after = new Map(next.map(item => [item.id, item]));
  const deleted = new Set(previous.filter(item => !after.has(item.id)).map(item => item.id));
  const changed = next.filter(item => !recordsEqual(before.get(item.id), item));
  const changes = new Map(changed.map(item => [item.id, item]));
  const result = current.filter(item => !deleted.has(item.id)).map(item => changes.get(item.id) ?? item);
  const existing = new Set(result.map(item => item.id));
  return [...result, ...changed.filter(item => !existing.has(item.id))];
}

function recordsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const first = a as Record<string, unknown>; const second = b as Record<string, unknown>;
  const keys = Object.keys(first);
  return keys.length === Object.keys(second).length && keys.every(key => {
    const x = first[key]; const y = second[key];
    if (x === y) return true;
    if (x instanceof Date && y instanceof Date) return +x === +y;
    return typeof x === 'object' && typeof y === 'object' && JSON.stringify(x) === JSON.stringify(y);
  });
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

export interface WindowChoice extends ForegroundWindow { id: string; thumbnail: string; icon?: string }
