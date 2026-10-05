import { memo } from 'react';
import { format } from 'date-fns';
import { FiStar, FiTrash2, FiCalendar, FiTag } from 'react-icons/fi';
import type { TodoItem } from '../../types';
import { useBufferedEdit } from '../../hooks/useBufferedEdit';
import styles from './Widgets.module.scss';
export default memo(function TodoRow({ todo, update, remove }: { todo: TodoItem; update: (id: string, patch: Partial<TodoItem>) => void; remove: (id: string) => void }) {
  const content = useBufferedEdit(todo.content, value => update(todo.id, { content: value }));
  const tags = useBufferedEdit(todo.tags?.join(', ') || '', value => update(todo.id, { tags: value.split(',').map(t => t.trim()).filter(Boolean).slice(0,5) }));
  return <article className={`${styles.todoCard} ${todo.completed ? styles.completedCard : ''}`}>
    <div className={styles.todoRow}><input aria-label={`${todo.content} 완료`} type="checkbox" checked={todo.completed} onChange={e => update(todo.id, { completed: e.target.checked })} />
      <input className={todo.completed ? styles.done : ''} aria-label="할 일 수정" type="text" value={content.draft} onChange={e => content.change(e.target.value)} onBlur={content.flush} onCompositionStart={content.startComposition} onCompositionEnd={content.endComposition} />
      <button className={`${styles.iconButton} ${todo.important ? styles.selectedIcon : ''}`} aria-label={`${todo.content} 중요`} aria-pressed={todo.important} onClick={() => update(todo.id, { important: !todo.important })}><FiStar fill={todo.important ? 'currentColor' : 'none'} /></button>
      <button className={styles.iconButton} aria-label={`${todo.content} 삭제`} onClick={() => remove(todo.id)}><FiTrash2 size={13} /></button>
    </div>
    <div className={styles.taskMeta}><label className={styles.metaChip}><FiCalendar /><input aria-label={`${todo.content} 기한`} type="date" value={todo.dueDate ?? format(new Date(todo.date), 'yyyy-MM-dd')} onChange={e => update(todo.id, { dueDate: e.target.value, ...(e.target.value ? { date: new Date(`${e.target.value}T00:00:00`) } : {}) })} /></label>
      <label className={styles.metaChip}><FiTag /><input aria-label={`${todo.content} 태그`} placeholder="태그" value={tags.draft} onChange={e => tags.change(e.target.value)} onBlur={tags.flush} onCompositionStart={tags.startComposition} onCompositionEnd={tags.endComposition} /></label>
      {todo.microsoft && <span className={styles.syncBadge} title="Microsoft To Do 연결 항목">To Do</span>}
    </div>
  </article>;
});
