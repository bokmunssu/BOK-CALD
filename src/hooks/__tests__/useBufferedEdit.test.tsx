import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useBufferedEdit } from '../useBufferedEdit';
import { flushEdits } from '../../utils/editing';
const commit = vi.fn();
function Editor() {
  const edit = useBufferedEdit<string>('old', commit);
  return <input aria-label="입력" value={edit.draft} onChange={e => edit.change(e.target.value)} onCompositionStart={edit.startComposition} onCompositionEnd={edit.endComposition} />;
}
beforeEach(() => { vi.useFakeTimers(); commit.mockClear(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it('does not save Korean composition mid-word and saves only the finished text', () => {
  render(<Editor />); const input=screen.getByLabelText('입력');
  fireEvent.compositionStart(input); fireEvent.change(input,{target:{value:'ㅎ'}});
  act(() => { vi.advanceTimersByTime(500); }); expect(commit).not.toHaveBeenCalled();
  fireEvent.change(input,{target:{value:'한글'}}); fireEvent.compositionEnd(input);
  act(() => { vi.advanceTimersByTime(300); }); expect(commit).toHaveBeenCalledTimes(1); expect(commit).toHaveBeenCalledWith('한글');
});
it('flushes the latest draft before closing without waiting for or duplicating the timer', async () => {
  render(<Editor />); fireEvent.change(screen.getByLabelText('입력'),{target:{value:'마지막 입력'}});
  await act(async () => { await flushEdits(); });
  expect(commit).toHaveBeenCalledWith('마지막 입력');
  act(() => { vi.advanceTimersByTime(1000); }); expect(commit).toHaveBeenCalledTimes(1);
});
