import { useRecoilState } from 'recoil';
import { memosState } from '../../store/atoms';
import { v4 as uuid } from 'uuid';
import { openWidget } from './WorkspaceControls';
import styles from './Widgets.module.scss';

export default function Notes() {
  const [notes, setNotes] = useRecoilState(memosState);
  const create = () => {
    const id = uuid(); const now = new Date();
    setNotes(items => [...items, { id, title: '새 메모', content: '', date: now, createdAt: now, updatedAt: now }]);
    openWidget('memo', id);
  };
  return <div className={styles.notes}>
    <button onClick={create}>+ 새 메모</button>
    {notes.length === 0 && <p>여러 메모를 각각 독립 창으로 열 수 있습니다.</p>}
    {notes.map(note => <article key={note.id}>
      <button onClick={() => openWidget('memo', note.id)}>{note.title || note.content.slice(0, 24) || '메모'} ↗</button>
      <p className={styles.message}>{note.content.slice(0, 80)}</p>
      <button onClick={() => {
        if (confirm('이 메모를 삭제할까요?')) setNotes(items => items.filter(item => item.id !== note.id));
      }}>삭제</button>
    </article>)}
  </div>;
}

export function MemoEditor({ id }: { id: string }) {
  const [notes, setNotes] = useRecoilState(memosState);
  const note = notes.find(item => item.id === id);
  if (!note) return <p>메모를 불러오는 중이거나 삭제된 메모입니다.</p>;
  const update = (change: { title?: string; content?: string }) => setNotes(items => items.map(item =>
    item.id === id ? { ...item, ...change, updatedAt: new Date() } : item));
  return <div className={styles.memoEditor}>
    <input aria-label="메모 제목" placeholder="메모 제목" value={note.title ?? ''} onChange={e => update({ title: e.target.value })} />
    <textarea aria-label="메모 내용" placeholder="자유롭게 적어 주세요…" value={note.content} onChange={e => update({ content: e.target.value })} />
    <small className={styles.message}>입력 내용은 자동으로 저장됩니다.</small>
  </div>;
}
