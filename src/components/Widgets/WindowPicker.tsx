import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiRefreshCw, FiSearch } from 'react-icons/fi';
import type { WindowChoice } from '../../utils/workspace';
import styles from './Widgets.module.scss';
export default function WindowPicker({ onSelect, onClose }: { onSelect: (value: WindowChoice) => void; onClose: () => void }) {
  const [items, setItems] = useState<WindowChoice[]>([]); const [query, setQuery] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = async () => { setBusy(true); setError(''); try { setItems(await window.electronAPI.system.windows()); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  useEffect(() => { void load(); const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, []);
  return createPortal(<div className={styles.modalBackdrop} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={styles.windowPanel} role="dialog" aria-modal="true" aria-label="기록할 창 선택">
      <header className={styles.sectionHeading}><strong>기록할 프로그램 / 창</strong><span className={styles.spacer} /><button className={styles.iconButton} aria-label="창 목록 새로고침" disabled={busy} onClick={load}><FiRefreshCw /></button><button className={styles.iconButton} aria-label="창 선택 닫기" onClick={onClose}><FiX /></button></header>
      <label className={styles.search}><FiSearch /><input aria-label="실행 중인 창 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="프로그램 또는 창 제목 검색" /></label>
      <div className={styles.windowGrid}>{items.filter(w => (w.title + ' ' + w.processName).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(w => <button key={w.id} className={styles.windowCard} onClick={() => onSelect(w)}>
        <img className={styles.windowThumbnail} src={w.thumbnail} alt="" /><div>{w.icon && <img className={styles.windowIcon} src={w.icon} alt="" />}<strong>{w.title}</strong></div><small>{w.processName}</small>
      </button>)}</div>
      {busy && <p className={styles.message}>실행 중인 창을 불러오는 중…</p>}{error && <p className={styles.errorText}>{error}</p>}{!busy && !error && !items.length && <p className={styles.message}>선택할 창이 없습니다. 기록할 프로그램을 열고 새로고침하세요.</p>}
      <small className={styles.message}>선택한 뒤 프로그램 전체 또는 이 창 제목만 기록하도록 설정합니다. 브라우저는 각 창의 현재 활성 탭 제목으로 구분합니다. 미리보기는 이 화면에서만 사용하며 저장·전송하지 않습니다.</small>
    </section></div>, document.body);
}
