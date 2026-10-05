import { useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { categoriesState, eventsState, googleCalendarSyncState } from '../../store/atoms';
import type { Category } from '../../types';
import { v4 as uuid } from 'uuid';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { googleCalendarService } from '../../services/googleCalendarService';
import styles from '../Widgets/Widgets.module.scss';

export function CategoryManager({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useRecoilState(categoriesState);
  const [events, setEvents] = useRecoilState(eventsState); const sync = useRecoilValue(googleCalendarSyncState);
  const [editing, setEditing] = useState<Category | null>(null); const [form, setForm] = useState(false);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [color, setColor] = useState('#b6a7d6');
  const [google, setGoogle] = useState(false); const [busy, setBusy] = useState(false);
  return <div className={styles.modalBackdrop} onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}><section className={styles.categoryPanel} role="dialog" aria-modal="true" aria-label="카테고리 관리">
    <header className={styles.sectionHeading}><h2>카테고리 관리</h2><span className={styles.spacer} /><button className={styles.iconButton} aria-label="카테고리 관리 닫기" onClick={onClose}><FiX /></button></header>
    <p className={styles.message}>일정을 분류하고 나에게 맞는 색을 골라 주세요.</p>
    <button onClick={() => { setEditing(null); setName(''); setDescription(''); setColor('#b6a7d6'); setGoogle(sync.isConnected); setForm(true); }}><FiPlus />카테고리 추가</button>
    {form && <form className={styles.targetForm} onSubmit={async e => {
      e.preventDefault(); if (!name.trim()) return; setBusy(true);
      try {
        const now = new Date(); const id = editing?.id || uuid(); let googleCalendarId = editing?.googleCalendarId;
        if (google && !googleCalendarId && sync.isConnected) googleCalendarId = await googleCalendarService.getOrCreateCalendarForCategory(id, name.trim(), description.trim());
        const next: Category = { ...editing, id, name: name.trim(), description: description.trim(), color, googleCalendarId, createdInApp: editing?.createdInApp ?? true, createdAt: editing?.createdAt || now, updatedAt: now };
        setCategories(items => editing ? items.map(c => c.id === editing.id ? next : c) : [...items,next]); setForm(false);
      } catch (error) { toast.error(String(error)); } finally { setBusy(false); }
    }}><label className={styles.fieldLabel}>이름<input aria-label="카테고리 이름" value={name} onChange={e => setName(e.target.value)} required /></label>
      <label className={styles.fieldLabel}>설명<input value={description} onChange={e => setDescription(e.target.value)} /></label><label className={styles.compactToggle}>색<input aria-label="카테고리 색" type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
      {!editing?.googleCalendarId && sync.isConnected && <label className={styles.compactToggle}><input type="checkbox" checked={google} onChange={e => setGoogle(e.target.checked)} />내 Google 캘린더와 연결</label>}
      <div className={styles.actions}><button className={styles.primaryButton} disabled={busy}>저장</button><button type="button" onClick={() => setForm(false)}>취소</button></div>
    </form>}
    {categories.map(category => <div key={category.id} className={styles.accountCard}><span style={{ width:10,height:10,borderRadius:'50%',background:category.color,flexShrink:0 }} /><div><strong>{category.name}</strong><small>{category.googleCalendarId ? 'Google 연결' : category.description || '로컬 카테고리'}</small></div><span className={styles.spacer} />
      <button className={styles.iconButton} aria-label={`${category.name} 수정`} onClick={() => { setEditing(category);setGoogle(sync.isConnected);setName(category.name);setDescription(category.description||'');setColor(category.color);setForm(true); }}><FiEdit2 /></button>
      {!category.isDefault && <button className={styles.iconButton} aria-label={`${category.name} 삭제`} onClick={() => { if (!confirm('카테고리를 삭제할까요? 일정은 기본 카테고리로 이동합니다.')) return;setCategories(items=>items.filter(c=>c.id!==category.id));setEvents(events.map(event=>event.categoryId===category.id?{...event,categoryId:'default'}:event)); }}><FiTrash2 /></button>}
    </div>)}
  </section></div>;
}
