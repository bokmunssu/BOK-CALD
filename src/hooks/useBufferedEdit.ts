import { useCallback, useEffect, useRef, useState } from 'react';
import { registerEditorFlush } from '../utils/editing';
export function useBufferedEdit<T>(value: T, commit: (value: T) => void, delay = 300) {
  const [draft, setDraft] = useState(value);
  const latest = useRef(value); const dirty = useRef(false); const timer = useRef<ReturnType<typeof setTimeout>>();
  const composing = useRef(false);
  const save = useRef(commit); save.current = commit;
  const flush = useCallback(() => { clearTimeout(timer.current); if (dirty.current) { dirty.current = false; save.current(latest.current); } }, []);
  useEffect(() => { if (!dirty.current) { latest.current = value; setDraft(value); } }, [value]);
  useEffect(() => { const off = registerEditorFlush(flush); return () => { flush(); off(); }; }, [flush]);
  const change = (next: T) => { latest.current = next; dirty.current = true; setDraft(next); clearTimeout(timer.current); if (!composing.current) timer.current = setTimeout(flush, delay); };
  return { draft, change, flush, startComposition: () => { composing.current = true; clearTimeout(timer.current); }, endComposition: () => { composing.current = false; clearTimeout(timer.current); timer.current = setTimeout(flush, delay); } };
}
