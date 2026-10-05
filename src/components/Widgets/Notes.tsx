import { useCallback, useEffect, useRef, useState } from 'react';
import { useBufferedEdit } from '../../hooks/useBufferedEdit';
import { registerEditorFlush } from '../../utils/editing';
import { useRecoilState } from 'recoil';
import { memosState } from '../../store/atoms';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { FiPlus, FiExternalLink, FiTrash2, FiArrowLeft, FiImage, FiBold, FiItalic, FiUnderline } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { openWidget } from './WorkspaceControls';
import { readImage, sanitizeMemoHtml } from '../../utils/memo';
import type { MemoEntry } from '../../types';
import ImageHeader from '../Common/ImageHeader';
import { imageTransform } from '../../utils/banner';
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
        {note.image && <span className={styles.stickyImage}><img src={note.image} alt="" style={imageTransform(note)} /></span>}<strong>{note.title || '제목 없는 메모'}</strong><p>{note.content || '여기에 메모를 적어 보세요.'}</p><small>{format(new Date(note.updatedAt), 'yy. M. d.')}</small>
      </button>
      <div className={styles.stickyActions}><button className={styles.iconButton} aria-label={`${note.title || '메모'} 위젯 열기`} title="위젯으로 열기" onClick={() => openWidget('memo', note.id)}><FiExternalLink size={13}/></button><button className={styles.iconButton} aria-label={`${note.title || '메모'} 삭제`} title="삭제" onClick={() => { if (confirm('이 메모를 삭제할까요?')) setNotes(items => items.filter(item => item.id !== note.id)); }}><FiTrash2 size={13}/></button></div>
    </article>)}</div>
  </div>;
}

export function MemoEditor({ id }: { id: string }) {
  const [notes, setNotes] = useRecoilState(memosState); const editor = useRef<HTMLDivElement>(null); const upload = useRef<HTMLInputElement>(null);
  const note = notes.find(item => item.id === id);
  const update = useCallback((change: Partial<MemoEntry>) => setNotes(items => items.map(item => item.id === id ? { ...item, ...change, updatedAt: new Date() } : item)), [id, setNotes]);
  const title = useBufferedEdit(note?.title ?? '', value => update({ title: value }));
  const pending = useRef(false); const composing = useRef(false); const timer = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const save = useCallback(() => {
    clearTimeout(timer.current);
    const el = editor.current;
    if (pending.current && el) { pending.current = false; update({ html: sanitizeMemoHtml(el.innerHTML), content: el.innerText ?? el.textContent ?? '' }); setSaving(false); }
  }, [update]);
  const schedule = () => { pending.current = true; setSaving(true); clearTimeout(timer.current); if (!composing.current) timer.current = setTimeout(save, 300); };
  useEffect(() => { const off = registerEditorFlush(save); return () => { save(); off(); }; }, [save]);
  useEffect(() => {
    if (!editor.current || !note || document.activeElement === editor.current) return;
    if (note.html) editor.current.innerHTML = sanitizeMemoHtml(note.html); else editor.current.textContent = note.content;
  }, [id, note?.html, note?.content]);
  if (!note) return <div className={styles.emptyState}>메모를 불러오는 중이거나 삭제된 메모입니다.</div>;
  const formatText = (command: string) => { editor.current?.focus(); document.execCommand(command); pending.current = true; save(); };
  return <div className={styles.memoEditor} style={note.paperColor ? { background: note.paperColor, color: '#33313a' } : undefined}>
    {note.image && <ImageHeader image={note.image} placement={note} label="메모" onChange={update} onRemove={() => update({ image: '' })} />}
    <div className={styles.memoHeading}><input aria-label="메모 제목" placeholder="제목 없는 메모" value={title.draft} onChange={e => title.change(e.target.value)} onBlur={title.flush} onCompositionStart={title.startComposition} onCompositionEnd={title.endComposition} /><small>{format(new Date(note.updatedAt), 'yy.MM.dd HH:mm')}</small></div>
    <div ref={editor} className={styles.richEditor} style={{ fontSize: Math.max(10, Math.min(36, note.fontSize || 13)) }} role="textbox" aria-label="메모 내용" aria-multiline="true" data-placeholder="자유롭게 적어 주세요…" contentEditable suppressContentEditableWarning onInput={schedule} onBlur={save}
      onCompositionStart={() => { composing.current = true; clearTimeout(timer.current); }} onCompositionEnd={() => { composing.current = false; schedule(); }}
      onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); schedule(); }} />
    <footer className={styles.memoTools}>
      <button className={styles.iconButton} title="굵게" aria-label="굵게" onMouseDown={e => e.preventDefault()} onClick={() => formatText('bold')}><FiBold /></button>
      <button className={styles.iconButton} title="기울임" aria-label="기울임" onMouseDown={e => e.preventDefault()} onClick={() => formatText('italic')}><FiItalic /></button>
      <button className={styles.iconButton} title="밑줄" aria-label="밑줄" onMouseDown={e => e.preventDefault()} onClick={() => formatText('underline')}><FiUnderline /></button>
      <button className={styles.iconButton} title="취소선" aria-label="취소선" onMouseDown={e => e.preventDefault()} onClick={() => formatText('strikeThrough')}><s>S</s></button>
      <select aria-label="메모 글자 크기" title="글자 크기" value={note.fontSize || 13} onChange={e => update({ fontSize: Number(e.target.value) })}>{[10,11,12,13,14,16,18,20,24,28,32,36].map(size => <option key={size} value={size}>{size}</option>)}</select><span className={styles.spacer} />
      <label className={styles.colorPick} title="메모 색"><input aria-label="메모 색" type="color" value={note.paperColor || '#fff9dc'} onChange={e => update({ paperColor: e.target.value })} /></label>
      <button className={styles.iconButton} title="메모 이미지 추가" aria-label="메모 이미지 추가" onClick={() => upload.current?.click()}><FiImage /></button>
      <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { update({ image: await readImage(file), positionX: 50, positionY: 50, zoom: 1 }); } catch (err) { toast.error(String(err)); } e.target.value = ''; }} />
    </footer>
    <span className={styles.saveHint} aria-live="polite">{saving ? '입력 중…' : '자동 저장'}</span>
  </div>;
}
