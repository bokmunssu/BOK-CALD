import { memo } from 'react';
import { format } from 'date-fns';
import { FiStar, FiTrash2, FiCalendar, FiList } from 'react-icons/fi';
import type { TodoItem } from '../../types';
import { useBufferedEdit } from '../../hooks/useBufferedEdit';
import styles from './Widgets.module.scss';
import type { GoogleTasksStatus } from '../../types/googleTasks';
export default memo(function TodoRow({ todo, update, remove, tasks }: { tasks: GoogleTasksStatus; todo: TodoItem; update: (id: string, patch: Partial<TodoItem>) => void; remove: (id: string) => void }) {
  const content = useBufferedEdit(todo.content, value => update(todo.id, { content: value }));
  return <article className={`${styles.todoCard} ${todo.completed ? styles.completedCard : ''}`}>
    <div className={styles.todoRow}><input aria-label={`${todo.content} 완료`} type="checkbox" checked={todo.completed} onChange={e => update(todo.id, { completed: e.target.checked })} />
      <input className={todo.completed ? styles.done : ''} aria-label="할 일 수정" type="text" value={content.draft} onChange={e => content.change(e.target.value)} onBlur={content.flush} onCompositionStart={content.startComposition} onCompositionEnd={content.endComposition} />
      <button className={`${styles.iconButton} ${todo.important ? styles.selectedIcon : ''}`} aria-label={`${todo.content} 중요`} title="중요 표시 (TOMO에만 저장 · Google API 미지원)" aria-pressed={todo.important} onClick={() => update(todo.id, { important: !todo.important })}><FiStar fill={todo.important ? 'currentColor' : 'none'} /></button>
      <button className={styles.iconButton} aria-label={`${todo.content} 삭제`} onClick={() => remove(todo.id)}><FiTrash2 size={13} /></button>
    </div>
    <div className={styles.taskMeta}><label className={styles.metaChip}><FiCalendar /><input aria-label={`${todo.content} 기한`} type="date" value={todo.dueDate ?? format(new Date(todo.date), 'yyyy-MM-dd')} onChange={e => update(todo.id, { dueDate: e.target.value, ...(e.target.value ? { date: new Date(`${e.target.value}T00:00:00`) } : {}) })} /></label>
      <label className={styles.metaChip} title={tasks.connected ? "Google Tasks 목록을 선택하면 다음 동기화 때 이동합니다" : "Google Tasks 연결 후 목록을 선택할 수 있습니다"}><FiList />
        <select aria-label={`${todo.content} 목록`} disabled={!tasks.connected || tasks.syncing} value={todo.taskListAccountId === tasks.accountId ? (todo.taskListId || todo.googleTasks?.listId || '') : (todo.googleTasks?.accountId === tasks.accountId ? todo.googleTasks?.listId : '')} onChange={e => update(todo.id, {taskListId:e.target.value || tasks.defaultListId, taskListAccountId:tasks.accountId})}>
          <option value="">기본 목록{tasks.defaultListId ? `: ${tasks.lists?.find(l=>l.id===tasks.defaultListId)?.title || ''}` : ''}</option>
          {tasks.lists?.map(list=><option key={list.id} value={list.id}>{list.title}</option>)}
        </select>
      </label>
      {todo.googleTasks && <span className={styles.syncBadge} title="Google Tasks 연결 항목">Tasks</span>}
    </div>
  </article>;
});
