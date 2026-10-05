import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { differenceInCalendarDays, format } from 'date-fns';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import { dDaysState } from '../../store/atoms';
import DDayModal from '../Common/DDayModal';
import TodoList from './TodoList';
import { MemoEditor } from './Notes';
import Pomodoro from './Pomodoro';
import styles from './Widgets.module.scss';

export function DDayBoard() {
  const days = useRecoilValue(dDaysState);
  const [editing, setEditing] = useState(false);
  const [today, setToday] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setToday(new Date()), 30000); return () => clearInterval(timer); }, []);
  return <>
    <button onClick={() => setEditing(true)}>디데이 추가·관리</button>
    {days.length === 0 && <p>기념일이나 목표 날짜를 추가해 주세요.</p>}
    {[...days].sort((a, b) => +new Date(a.targetDate) - +new Date(b.targetDate)).map(day => {
      const diff = differenceInCalendarDays(new Date(day.targetDate), today);
      return <article className={styles.ddayRow} key={day.id}>
        <strong>{diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${-diff}`} · {day.title}</strong>
        <small>{format(new Date(day.targetDate), 'yyyy-MM-dd')}</small>
        {day.description && <p>{day.description}</p>}
      </article>;
    })}
    {editing && <DDayModal onClose={() => setEditing(false)} />}
  </>;
}

export default function WidgetApp() {
  useTheme();
  const params = new URLSearchParams(location.search);
  const kind = params.get('widget'); const memoId = params.get('memoId') ?? '';
  const [pinned, setPinned] = useState(false);
  useEffect(() => { window.electronAPI?.getPinned?.().then(setPinned).catch(() => toast.error('창 설정을 불러오지 못했습니다.')); }, []);
  const labels: Record<string, string> = { todo: '할 일', memo: '메모장', dday: '디데이', pomodoro: '뽀모도로' };
  const label = labels[kind ?? ''] ?? '위젯';
  return <div className={styles.widget}>
    <Toaster />
    <header className={styles.toolbar}>
      <strong>{label}</strong><span className={styles.spacer} />
      <button aria-pressed={pinned} onClick={async () => {
        try { setPinned(await window.electronAPI.setPinned(!pinned)); } catch { toast.error('창 고정에 실패했습니다.'); }
      }}>{pinned ? '고정 해제' : '맨 위 고정'}</button>
      <button onClick={() => window.electronAPI?.openCalendar().catch(() => toast.error('캘린더를 열지 못했습니다.'))}>캘린더</button>
    </header>
    <main className={styles.content}>
      {kind === 'memo' && <MemoEditor id={memoId} />}
      {kind === 'todo' && <TodoList />}
      {kind === 'dday' && <DDayBoard />}
      {kind === 'pomodoro' && <Pomodoro />}
    </main>
  </div>;
}
