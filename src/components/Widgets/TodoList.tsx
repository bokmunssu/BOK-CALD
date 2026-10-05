import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { todosState } from '../../store/atoms';
import { todoAppearanceState } from '../../store/workspace';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { FiPlus, FiSearch, FiImage, FiExternalLink, FiCalendar } from 'react-icons/fi';
import TodoRow from './TodoRow';
import toast from 'react-hot-toast';
import type { TodoItem } from '../../types';
import { readImage } from '../../utils/memo';
import { openWidget } from './WorkspaceControls';
import ImageHeader from '../Common/ImageHeader';
import GoogleTasksPanel from './GoogleTasksPanel';
import GoogleTasksIcon from '../Common/GoogleTasksIcon';
import {useGoogleTasksLists} from '../../hooks/useGoogleTasksLists';
import styles from './Widgets.module.scss';

export default function TodoList({ date }: { date?: Date }) {
  const tasks = useGoogleTasksLists();
  const [newList, setNewList] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [todos, setTodos] = useRecoilState(todosState); const [appearance, setAppearance] = useRecoilState(todoAppearanceState);
  const [day, setDay] = useState(format(date ?? new Date(), 'yyyy-MM-dd')); const [content, setContent] = useState('');
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [allDates, setAllDates] = useState(!date);
  const [syncOpen, setSyncOpen] = useState(false); const upload = useRef<HTMLInputElement>(null);
  useEffect(() => { if (date) setDay(format(date, 'yyyy-MM-dd')); }, [date]);
  const visible = useMemo(() => todos.filter(todo => (allDates || format(new Date(todo.date), 'yyyy-MM-dd') === day)
    && (listFilter === 'all' || (todo.taskListAccountId === tasks.accountId ? todo.taskListId : todo.googleTasks?.accountId === tasks.accountId ? todo.googleTasks?.listId : '') === listFilter)
    && todo.content.toLowerCase().includes(search.toLowerCase())
    && (filter === 'all' || (filter === 'pending' ? !todo.completed : filter === 'completed' ? todo.completed : todo.important)))
    .sort((a,b) => Number(a.completed) - Number(b.completed) || Number(b.important) - Number(a.important)), [todos,day,allDates,search,filter,listFilter,tasks.accountId]);
  const update = useCallback((id: string, patch: Partial<TodoItem>) => setTodos(items => items.map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date() } : item)), [setTodos]);
  const remove = useCallback((id: string) => { if (confirm('이 할 일을 삭제할까요?')) setTodos(items => items.filter(item => item.id !== id)); }, [setTodos]);
  return <div className={styles.todoList}>
    {appearance.image && <ImageHeader image={appearance.image} placement={appearance} label="할 일" onChange={p => setAppearance(a => ({ ...a, ...p }))} onRemove={() => setAppearance(a => ({ ...a, image: '' }))} />}
    <div className={styles.sectionHeading}><strong>할 일</strong><small>{visible.filter(t => t.completed).length}/{visible.length} 완료</small><span className={styles.spacer} />
      <button className={styles.iconButton} title="Google Tasks 연동" aria-label="Google Tasks 연동" onClick={() => setSyncOpen(true)}><GoogleTasksIcon /></button>
      <button className={styles.iconButton} title="배너 이미지 추가" aria-label="할 일 이미지 추가" onClick={() => upload.current?.click()}><FiImage /></button>
      {date && <button className={styles.iconButton} title="할 일 위젯 열기" aria-label="할 일 위젯 열기" onClick={() => openWidget('todo')}><FiExternalLink /></button>}
    </div>
    {!date && <div className={styles.taskDate}><FiCalendar /><input aria-label="할 일 날짜" type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} /></div>}
    <form className={styles.addTask} onSubmit={e => { e.preventDefault(); if (!content.trim()) return; const now = new Date(); setTodos(items => [...items, { id: uuid(), date: new Date(`${day}T00:00:00`), dueDate: day, content: content.trim(), completed: false, important: false, ...(tasks.connected && newList ? {taskListId:newList,taskListAccountId:tasks.accountId}:{}), createdAt: now, updatedAt: now }]); setContent(''); }}>
      <FiPlus />{tasks.connected && <select aria-label="새 할 일 목록" value={newList} onChange={e=>setNewList(e.target.value)}><option value="">기본 목록</option>{tasks.lists?.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>}<input aria-label="새 할 일" placeholder="할 일 추가" value={content} onChange={e => setContent(e.target.value)} /><button className={styles.iconButton} aria-label="추가" disabled={!content.trim()}><FiPlus /></button>
    </form>
    <div className={styles.todoFilters}><div className={styles.searchBox}><FiSearch /><input aria-label="할 일 검색" placeholder="검색" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select aria-label="할 일 필터" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">전체</option><option value="pending">미완료</option><option value="completed">완료</option><option value="important">중요</option></select>
      <select aria-label="목록별 할 일 보기" value={listFilter} onChange={e=>setListFilter(e.target.value)}><option value="all">모든 목록</option>{tasks.lists?.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>
      <label title="모든 날짜의 할 일 표시"><input type="checkbox" checked={allDates} onChange={e => setAllDates(e.target.checked)} />모두</label>
    </div>
    {!visible.length && <div className={styles.emptyState}><strong>{search ? '검색 결과가 없어요' : '조금씩, 하나씩 완료해 보세요'}</strong><span>위에서 오늘 할 일을 추가해 주세요.</span></div>}
    <div className={styles.todoRows}>{visible.map(todo => <TodoRow key={todo.id} todo={todo} tasks={tasks} update={update} remove={remove} />)}</div>
    <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { setAppearance({ image: await readImage(file), positionX: 50, positionY: 50, zoom: 1 }); } catch (err) { toast.error(String(err)); } e.target.value = ''; }} />
    {syncOpen && <GoogleTasksPanel onClose={() => setSyncOpen(false)} />}
  </div>;
}
