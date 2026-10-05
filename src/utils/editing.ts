const editors = new Set<() => void>();
const saves = new Set<Promise<unknown>>();
export function registerEditorFlush(flush: () => void) { editors.add(flush); return () => { editors.delete(flush); }; }
export function trackSave<T>(save: Promise<T>): Promise<T> { saves.add(save); void save.then(() => saves.delete(save), () => saves.delete(save)); return save; }
export async function flushEdits() {
  for (const flush of [...editors]) flush();
  await Promise.resolve();
  while (saves.size) await Promise.all([...saves]);
}
