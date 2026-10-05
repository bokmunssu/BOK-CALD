import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRecoilState } from 'recoil';
import { FiType, FiX, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { workspaceSettingsState } from '../../store/workspace';
import styles from './Widgets.module.scss';
import { installedFonts } from '../../utils/localFonts';
export default function FontSettings({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(embedded);
  const [settings, setSettings] = useRecoilState(workspaceSettingsState);
  const [fonts, setFonts] = useState<string[]>([]); const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = async (refresh = false) => {
    setBusy(true); setError('');
    try { setFonts(await installedFonts(refresh)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (open) void load(); }, [open]);
  useEffect(() => { if (!open || embedded) return; const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [open, embedded]);
  const choose = (fontFamily: string) => setSettings(s => ({ ...s, fontFamily }));
  const panel = <section className={styles.fontPanel} role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} aria-label="폰트 설정">
        <header className={styles.sectionHeading}><strong>내 컴퓨터의 폰트</strong><span className={styles.spacer} /><button aria-label="폰트 목록 새로고침" className={styles.iconButton} disabled={busy} onClick={() => load(true)}><FiRefreshCw /></button>{!embedded && <button aria-label="폰트 설정 닫기" className={styles.iconButton} onClick={() => setOpen(false)}><FiX /></button>}</header>
        <input aria-label="폰트 검색" placeholder="폰트 검색" value={query} onChange={e => setQuery(e.target.value)} />
        <div className={styles.fontPreview}>가볍게 기록하는 하루 · TOMO 0123456789</div>
        <button onClick={() => choose('')}>기본 시스템 폰트{!settings.fontFamily && <FiCheck />}</button>
        <div className={styles.fontList}>{fonts.filter(f => f.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(f => <button key={f} aria-pressed={settings.fontFamily === f} onClick={() => choose(f)}><span>{f}</span>{settings.fontFamily === f && <FiCheck />}</button>)}</div>
        {busy && <p className={styles.message}>설치된 폰트를 불러오는 중…</p>}{error && <p className={styles.errorText}>{error}</p>}
        <label className={styles.fieldLabel}>직접 지정<input aria-label="직접 지정할 폰트 이름" value={settings.fontFamily} onChange={e => choose(e.target.value)} placeholder="설치된 폰트의 정확한 이름" /></label>
        <small className={styles.message}>선택하면 캘린더와 모든 위젯에 바로 적용됩니다. 지원하지 않는 글자는 시스템 폰트로 표시됩니다.</small>
      </section>;
  if (embedded) return panel;
  return <><button className={styles.iconButton} aria-label="폰트 설정" title="폰트 설정" onClick={() => setOpen(true)}><FiType /></button>
    {open && createPortal(<div className={styles.modalBackdrop} onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>{panel}</div>, document.body)}
  </>;
}
