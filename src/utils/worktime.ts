import { matchesTarget, type FocusTarget, type ForegroundWindow } from './workspace';

export interface WorkTarget {
  id: string;
  label: string;
  target: FocusTarget;
  days: Record<string, number>;
}
export interface WorkTimeState { running: boolean; targets: WorkTarget[] }
export interface WorkTimeSnapshot extends WorkTimeState { activeId: string | null; supported: boolean }
export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const totalTime = (target: WorkTarget) => Object.values(target.days).reduce((a, b) => a + b, 0);
export function activeTarget(targets: WorkTarget[], active: ForegroundWindow | null) {
  return targets.find(t => t.target.mode === 'title' && matchesTarget(t.target, active))
    ?? targets.find(t => matchesTarget(t.target, active));
}
export function recordWorkTime(state: WorkTimeState, elapsed: number, active: ForegroundWindow | null, date = new Date()): WorkTimeState {
  if (!state.running || elapsed <= 0 || elapsed >= 2000 || !Number.isFinite(elapsed)) return state;
  const selected = activeTarget(state.targets, active);
  if (!selected) return state;
  // Split a tick at local midnight so yesterday's time never leaks into today.
  const end = date.getTime(); const start = end - elapsed;
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const pieces = start < midnight ? [[localDay(new Date(start)), midnight - start], [localDay(date), end - midnight]] : [[localDay(date), elapsed]];
  return { ...state, targets: state.targets.map(t => {
    if (t.id !== selected.id) return t;
    const days = { ...t.days };
    for (const [day, ms] of pieces) days[String(day)] = (days[String(day)] ?? 0) + Number(ms);
    return { ...t, days };
  }) };
}
export function formatDuration(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
