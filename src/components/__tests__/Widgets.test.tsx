import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import TodoList from '../Widgets/TodoList';
import Notes, { MemoEditor } from '../Widgets/Notes';
import WorkspaceControls from '../Widgets/WorkspaceControls';
import { DDayCard } from '../Widgets/WidgetApp';
import { todosState, memosState, dDaysState } from '../../store/atoms';

beforeEach(() => { vi.clearAllMocks(); });
describe('independent widget content', () => {
  it('adds, completes and filters tasks without losing the original task', async () => {
    render(<RecoilRoot><TodoList date={new Date(2026, 9, 4)} /></RecoilRoot>);
    fireEvent.change(screen.getByLabelText('새 할 일'), { target: { value: '집중 작업' } });
    fireEvent.click(screen.getByLabelText('추가'));
    expect(screen.getByDisplayValue('집중 작업')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('집중 작업 완료'));
    fireEvent.change(screen.getByLabelText('할 일 필터'), { target: { value: 'pending' } });
    expect(screen.queryByDisplayValue('집중 작업')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('할 일 필터'), { target: { value: 'all' } });
    expect(screen.getByDisplayValue('집중 작업')).toBeInTheDocument();
    await waitFor(() => expect(window.electronAPI.store.set).toHaveBeenCalled());
  });
  it('searches across dates and toggles importance', () => {
    render(<RecoilRoot initializeState={({ set }) => set(todosState, [{ id: 'a', date: new Date(2026, 0, 1), content: '이전 작업', completed: false, important: false, createdAt: new Date() }])}><TodoList date={new Date(2026, 9, 4)} /></RecoilRoot>);
    expect(screen.queryByDisplayValue('이전 작업')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('모두'));
    fireEvent.click(screen.getByLabelText('이전 작업 중요'));
    expect(screen.getByLabelText('이전 작업 중요')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('할 일 검색'), { target: { value: '없는 작업' } });
    expect(screen.queryByDisplayValue('이전 작업')).not.toBeInTheDocument();
  });
  it('opens distinct windows for multiple new notes', () => {
    window.electronAPI.openWidget = vi.fn().mockResolvedValue(undefined);
    render(<RecoilRoot><Notes /></RecoilRoot>);
    fireEvent.click(screen.getByLabelText('새 메모')); fireEvent.click(screen.getByLabelText('새 메모'));
    const calls = vi.mocked(window.electronAPI.openWidget).mock.calls;
    expect(calls).toHaveLength(2); expect(calls[0][1]).not.toBe(calls[1][1]);
  });
  it('edits a selected memo while preserving a second memo', async () => {
    const now = new Date();
    render(<RecoilRoot initializeState={({ set }) => set(memosState, [
      { id: 'a', content: '첫 번째', date: now, createdAt: now, updatedAt: now },
      { id: 'b', content: '두 번째', date: now, createdAt: now, updatedAt: now },
    ])}><MemoEditor id="a" /></RecoilRoot>);
    const editor = screen.getByLabelText('메모 내용'); editor.textContent = '수정 완료'; fireEvent.input(editor);
    await waitFor(() => expect(window.electronAPI.store.set).toHaveBeenCalledWith('memos', expect.arrayContaining([
      expect.objectContaining({ id: 'a', content: '수정 완료' }), expect.objectContaining({ id: 'b', content: '두 번째' }),
    ])));
  });
  it('keeps simple mode compact and moves banner/font settings out of the toolbar', () => {
    render(<RecoilRoot><WorkspaceControls /></RecoilRoot>);
    const simple = screen.getByLabelText('심플 모드');
    expect(simple).toBeChecked(); fireEvent.click(simple); expect(simple).not.toBeChecked();
    expect(screen.queryByLabelText('배너 높이')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name:'폰트 설정'})).not.toBeInTheDocument();
  });
  it('shows several D-days with calendar-day differences', () => {
    const now = new Date(); const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    render(<RecoilRoot initializeState={({ set }) => set(dDaysState, [
      { id: 'today', title: '오늘 목표', targetDate: now, isActive: true, createdAt: now },
      { id: 'next', title: '내일 목표', targetDate: tomorrow, isActive: false, createdAt: now },
    ])}><><DDayCard id="today" /><DDayCard id="next" /></></RecoilRoot>);
    expect(screen.getByText('오늘 목표')).toBeInTheDocument();
    expect(screen.getByText('D-1')).toBeInTheDocument();
  });
});
