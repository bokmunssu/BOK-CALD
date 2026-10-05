import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { differenceInCalendarDays, format } from 'date-fns';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { FiCalendar, FiMinus, FiX } from 'react-icons/fi';
import { useTheme } from '../../hooks/useTheme';
import { dDaysState, memosState } from '../../store/atoms';
import TodoList from './TodoList';
import { MemoEditor } from './Notes';
import Pomodoro from './Pomodoro';
import WorkTime from './WorkTime';
import PinButton from './PinButton';
import styles from './Widgets.module.scss';

export function DDayCard({ id }: { id: string }) {
  const days = useRecoilValue(dDaysState); const day = days.find(d => d.id === id);
  const [today, setToday] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setToday(new Date()), 30000); return () => clearInterval(timer); }, []);
  if (!day) return <div className={styles.emptyState}><strong>디데이가 삭제되었습니다</strong><span>캘린더의 D-DAY 관리에서 새 항목을 열어 주세요.</span></div>;
  const diff = differenceInCalendarDays(new Date(day.targetDate), today);
  return <article className={styles.ddayCard}><small>{format(new Date(day.targetDate), 'yyyy.MM.dd')}</small>
    <output>{diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${-diff}`}</output>
    <h2>{day.title}</h2>{day.description && <p>{day.description}</p>}</article>;
}
export default function WidgetApp() {
  useTheme();
  const params = new URLSearchParams(location.search); const kind = params.get('widget'); const id = params.get('itemId') || params.get('memoId') || '';
  const notes = useRecoilValue(memosState); const days = useRecoilValue(dDaysState);
  const labels: Record<string, string> = { todo: '할 일', memo: '메모', dday: 'D-DAY', pomodoro: '뽀모도로', worktime: '작업시간' };
  const label = kind === 'memo' ? notes.find(n => n.id === id)?.title || '메모' : kind === 'dday' ? days.find(d => d.id === id)?.title || 'D-DAY' : labels[kind ?? ''] || '위젯';
  useEffect(() => { document.title = `TOMO CALENDAR · ${label}`; }, [label]);
  return <div className={styles.widget}>
    <Toaster toastOptions={{ style: { background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 12 } }} />
    <header className={styles.toolbar}><span className={styles.brandMark}>T</span><strong>{label}</strong><span className={styles.spacer} /><PinButton />
      <button className={styles.iconButton} aria-label="캘린더" title="캘린더 열기" onClick={() => window.electronAPI.openCalendar().catch(() => toast.error('캘린더를 열지 못했습니다.'))}><FiCalendar /></button>
      <button className={styles.iconButton} aria-label="최소화" title="최소화" onClick={() => window.electronAPI.minimizeWindow()}><FiMinus /></button>
      <button className={`${styles.iconButton} ${styles.closeButton}`} aria-label="위젯 닫기" title="닫기" onClick={() => window.electronAPI.closeWindow()}><FiX /></button>
    </header>
    <main className={`${styles.content} ${kind === 'memo' ? styles.memoContent : ''}`}>
      {kind === 'memo' && <MemoEditor id={id} />}{kind === 'todo' && <TodoList />}
      {kind === 'dday' && <DDayCard id={id} />}{kind === 'pomodoro' && <Pomodoro />}{kind === 'worktime' && <WorkTime />}
    </main>
  </div>;
}
