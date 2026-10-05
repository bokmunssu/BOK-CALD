import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { memosState } from '../../store/atoms';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { FiPlus, FiExternalLink, FiTrash2, FiArrowLeft, FiImage, FiBold, FiItalic, FiUnderline } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { openWidget } from './WorkspaceControls';
import { readImage, sanitizeMemoHtml } from '../../utils/memo';
import type { MemoEntry } from '../../types';
import styles from './Widgets.module.scss';

export default function Notes({ inline = false }: { inline?: boolean }) {
  const [notes, setNotes] = useRecoilState(memosState); const [editing, setEditing] = useState<string | null>(null);
  const create = () => {
    const id = uuid(); const now = new Date();
    setNotes(items => [...items, { id, title: '새 메모', content: '', date: now, createdAt: now, updatedAt: now }]);
    if (inline) setEditing(id); else openWidget('memo', id);
  };
  if (editing && notes.some(n => n.id === editing)) return <div className={styles.inlineMemo}>
    <div className={styles.sectionHeading}><button className={styles.iconButton} aria-label="메모 목록으로" onClick={() => setEditing(null)}><FiArrowLeft /></button><span>메모 편집</span><span className={styles.spacer} /><button className={styles.iconButton} aria-label="메모 위젯 열기" onClick={() => openWidget('memo', editing)}><FiExternalLink /></button></div><MemoEditor id={editing} />
  </div>;
  return <div className={styles.notes}>
    <div className={styles.sectionHeading}><strong>스티커 메모</strong><small>{notes.length}개</small><span className={styles.spacer} /><button aria-label="새 메모" onClick={create}><FiPlus /> 새 메모</button></div>
    {!notes.length && <div className={styles.emptyState}><strong>생각을 가볍게 붙여 두세요</strong><span>메모마다 이미지와 색을 고르고, 각각 위젯으로 열 수 있어요.</span></div>}
    <div className={styles.stickyGrid}>{[...notes].sort((a,b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).map(note => <article key={note.id} className={styles.stickyCard} style={note.paperColor ? { background: note.paperColor, color: '#33313a' } : undefined}>
      <button className={styles.stickyOpen} onClick={() => inline ? setEditing(note.id) : openWidget('memo', note.id)} aria-label={`${note.title || '메모'} 열기`}>
        {note.image && <img src={note.image} alt="" />}<strong>{note.title || '제목 없는 메모'}</strong><p>{note.content || '여기에 메모를 적어 보세요.'}</p><small>{format(new Date(note.updatedAt), 'yy. M. d.')}</small>
      </button>
      <div className={styles.stickyActions}><button className={styles.iconButton} aria-label={`${note.title || '메모'} 위젯 열기`} title="위젯으로 열기" onClick={() => openWidget('memo', note.id)}><FiExternalLink size={13}/></button><button className={styles.iconButton} aria-label={`${note.title || '메모'} 삭제`} title="삭제" onClick={() => { if (confirm('이 메모를 삭제할까요?')) setNotes(items => items.filter(item => item.id !== note.id)); }}><FiTrash2 size={13}/></button></div>
    </article>)}</div>
  </div>;
}

export function MemoEditor({ id }: { id: string }) {
  const [notes, setNotes] = useRecoilState(memosState); const editor = useRef<HTMLDivElement>(null); const upload = useRef<HTMLInputElement>(null);
  const note = notes.find(item => item.id === id);
  useEffect(() => {
    if (!editor.current || !note || document.activeElement === editor.current) return;
    if (note.html) editor.current.innerHTML = sanitizeMemoHtml(note.html); else editor.current.textContent = note.content;
  }, [id, note?.html, note?.content]);
  if (!note) return <div className={styles.emptyState}>메모를 불러오는 중이거나 삭제된 메모입니다.</div>;
  const update = (change: Partial<MemoEntry>) => setNotes(items => items.map(item => item.id === id ? { ...item, ...change, updatedAt: new Date() } : item));
  const save = () => { const el = editor.current; if (el) update({ html: sanitizeMemoHtml(el.innerHTML), content: el.innerText ?? el.textContent ?? '' }); };
  const formatText = (command: string) => { editor.current?.focus(); document.execCommand(command); save(); };
  return <div className={styles.memoEditor} style={note.paperColor ? { background: note.paperColor, color: '#33313a' } : undefined}>
    {note.image && <div className={styles.memoBanner}><img src={note.image} alt="메모 이미지" /><button className={styles.iconButton} aria-label="메모 이미지 삭제" onClick={() => update({ image: '' })}><FiTrash2 /></button></div>}
    <div className={styles.memoHeading}><input aria-label="메모 제목" placeholder="제목 없는 메모" value={note.title ?? ''} onChange={e => update({ title: e.target.value })} /><small>{format(new Date(note.updatedAt), 'yy.MM.dd HH:mm')}</small></div>
    <div ref={editor} className={styles.richEditor} role="textbox" aria-label="메모 내용" aria-multiline="true" data-placeholder="자유롭게 적어 주세요…" contentEditable suppressContentEditableWarning onInput={save}
      onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); save(); }} />
    <footer className={styles.memoTools}>
      <button className={styles.iconButton} title="굵게" aria-label="굵게" onMouseDown={e => e.preventDefault()} onClick={() => formatText('bold')}><FiBold /></button>
      <button className={styles.iconButton} title="기울임" aria-label="기울임" onMouseDown={e => e.preventDefault()} onClick={() => formatText('italic')}><FiItalic /></button>
      <button className={styles.iconButton} title="밑줄" aria-label="밑줄" onMouseDown={e => e.preventDefault()} onClick={() => formatText('underline')}><FiUnderline /></button>
      <button className={styles.iconButton} title="취소선" aria-label="취소선" onMouseDown={e => e.preventDefault()} onClick={() => formatText('strikeThrough')}><s>S</s></button><span className={styles.spacer} />
      <label className={styles.colorPick} title="메모 색"><input aria-label="메모 색" type="color" value={note.paperColor || '#fff9dc'} onChange={e => update({ paperColor: e.target.value })} /></label>
      <button className={styles.iconButton} title="메모 이미지 추가" aria-label="메모 이미지 추가" onClick={() => upload.current?.click()}><FiImage /></button>
      <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { update({ image: await readImage(file) }); } catch (err) { toast.error(String(err)); } e.target.value = ''; }} />
    </footer>
    <span className={styles.saveHint} aria-live="polite">자동 저장</span>
  </div>;
}
