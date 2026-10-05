import { useEffect, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { todosState } from '../../store/atoms';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import type { TodoItem } from '../../types';
import styles from './Widgets.module.scss';

export default function TodoList({ date }: { date?: Date }) {
  const [todos, setTodos] = useRecoilState(todosState);
  const [day, setDay] = useState(format(date ?? new Date(), 'yyyy-MM-dd'));
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [allDates, setAllDates] = useState(false);
  useEffect(() => { if (date) setDay(format(date, 'yyyy-MM-dd')); }, [date]);
  const visible = useMemo(() => todos.filter(todo =>
    (allDates || format(new Date(todo.date), 'yyyy-MM-dd') === day)
    && todo.content.toLowerCase().includes(search.toLowerCase())
    && (filter === 'all' || (filter === 'pending' ? !todo.completed : todo.important)))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || Number(b.important) - Number(a.important)),
  [todos, day, allDates, search, filter]);
  const update = (id: string, patch: Partial<TodoItem>) => setTodos(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  return <div className={styles.notes}>
    {!date && <label>날짜 <input aria-label="할 일 날짜" type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} /></label>}
    <form className={styles.actions} onSubmit={e => {
      e.preventDefault(); if (!content.trim()) return;
      setTodos(items => [...items, { id: uuid(), date: new Date(`${day}T00:00:00`), content: content.trim(), completed: false, important: false, createdAt: new Date() }]);
      setContent('');
    }}>
      <input aria-label="새 할 일" placeholder="할 일을 입력하세요" value={content} onChange={e => setContent(e.target.value)} />
      <button disabled={!content.trim()}>추가</button>
    </form>
    <input aria-label="할 일 검색" placeholder="검색" value={search} onChange={e => setSearch(e.target.value)} />
    <div className={styles.actions}>
      <select aria-label="할 일 필터" value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">전체</option><option value="pending">미완료</option><option value="important">중요</option>
      </select>
      <label><input type="checkbox" checked={allDates} onChange={e => setAllDates(e.target.checked)} /> 모든 날짜</label>
    </div>
    <p className={styles.message}>{visible.filter(t => t.completed).length}/{visible.length}개 완료</p>
    {visible.length === 0 && <p>표시할 할 일이 없습니다.</p>}
    {visible.map(todo => <div key={todo.id}>
      <div className={styles.todoRow}>
        <input aria-label={`${todo.content} 완료`} type="checkbox" checked={todo.completed} onChange={e => update(todo.id, { completed: e.target.checked })} />
        <button aria-label={`${todo.content} 중요`} aria-pressed={todo.important} onClick={() => update(todo.id, { important: !todo.important })}>{todo.important ? '★' : '☆'}</button>
        <input className={todo.completed ? styles.done : ''} aria-label="할 일 수정" type="text" value={todo.content}
          onChange={e => update(todo.id, { content: e.target.value })} />
        <button aria-label={`${todo.content} 삭제`} onClick={() => {
          if (confirm('이 할 일을 삭제할까요?')) setTodos(items => items.filter(item => item.id !== todo.id));
        }}>×</button>
      </div>
      {allDates && <small>{format(new Date(todo.date), 'yyyy-MM-dd')}</small>}
    </div>)}
  </div>;
}
