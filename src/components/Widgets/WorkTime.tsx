import { useEffect, useState } from 'react';
import { FiPlus, FiPlay, FiPause, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDuration, localDay, totalTime, type WorkTimeSnapshot, type WorkTarget } from '../../utils/worktime';
import type { ForegroundWindow } from '../../utils/workspace';
import styles from './Widgets.module.scss';
import WindowPicker from './WindowPicker';
export default function WorkTime() {
  const [state, setState] = useState<WorkTimeSnapshot>({ running: false, targets: [], activeId: null, supported: false });
  const [choosing, setChoosing] = useState(false); const [target, setTarget] = useState<ForegroundWindow | null>(null);
  const [label, setLabel] = useState(''); const [mode, setMode] = useState<'program' | 'title'>('program'); const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const api = window.electronAPI?.workTime; if (!api) return;
    const off = api.subscribe(setState); api.get().then(setState).catch(() => toast.error('작업시간을 불러오지 못했습니다.')); return off;
  }, []);
  const command = async (action: 'start' | 'pause' | 'add' | 'remove' | 'rename', value?: Partial<WorkTarget>) => {
    try { setState(await window.electronAPI.workTime.command(action, value)); return true; } catch (error) { toast.error(String(error)); return false; }
  };
  const today = localDay(); const total = state.targets.reduce((sum, item) => sum + totalTime(item), 0);
  const todayTotal = state.targets.reduce((sum, item) => sum + (item.days[today] || 0), 0);
  return <div className={styles.workTime}>
    <div className={styles.sectionHeading}><span className={styles.statusDot} data-active={state.running} /><span>{state.running ? (state.activeId ? '기록 중' : '프로그램 활성화 대기') : '기록 일시정지'}</span><span className={styles.spacer} />
      <button className={styles.iconButton} aria-label={collapsed ? '프로그램 목록 펼치기' : '프로그램 목록 접기'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <FiChevronDown /> : <FiChevronUp />}</button></div>
    <div className={styles.workClock}><small>누적 작업시간</small><output aria-label="누적 작업시간">{formatDuration(total)}</output><div><span>오늘</span><strong aria-label="오늘 작업시간">{formatDuration(todayTotal)}</strong></div></div>
    <div className={styles.actions}><button className={styles.primaryButton} disabled={!state.supported || (!state.running && !state.targets.length)} onClick={() => command(state.running ? 'pause' : 'start')}>{state.running ? <FiPause /> : <FiPlay />}{state.running ? '일시정지' : '기록 시작'}</button>
      <button disabled={!state.supported} onClick={() => setChoosing(true)}><FiPlus />프로그램 추가</button></div>
    {choosing && <WindowPicker onClose={() => setChoosing(false)} onSelect={active => { setTarget(active); setLabel(active.processName); setMode('title'); setChoosing(false); }} />}
    {target && <form className={styles.targetForm} onSubmit={async e => { e.preventDefault(); if (await command('add', { label, target: { ...target, mode } })) setTarget(null); }}>
      <input aria-label="작업 대상 이름" value={label} onChange={e => setLabel(e.target.value)} placeholder="표시 이름" required />
      <select aria-label="작업 대상 구분" value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="program">이 프로그램 전체</option><option value="title">이 탭/창만</option></select>
      <small className={styles.message}>{mode === 'title' ? target.title : target.processName}</small><div className={styles.actions}><button className={styles.primaryButton}>추가</button><button type="button" onClick={() => setTarget(null)}>취소</button></div>
    </form>}
    {!collapsed && <div className={styles.workRows}>{state.targets.map((item, i) => <article key={item.id} className={`${styles.workRow} ${state.activeId === item.id ? styles.activeWork : ''}`}>
      <span className={styles.programIcon} style={{ '--program-hue': `${i * 67 + 210}` } as React.CSSProperties}>{item.label.slice(0, 1).toUpperCase()}</span>
      <div className={styles.workInfo}><div className={styles.sectionHeading}><strong title={item.target.mode === 'title' ? item.target.title : item.target.processName}>{item.label}</strong><small>{state.activeId === item.id ? '기록 중' : '대기 중'}</small></div><div className={styles.workStats}><span>전체 <b>{formatDuration(totalTime(item))}</b></span><span>오늘 <b>{formatDuration(item.days[today] || 0)}</b></span></div></div>
      <button className={styles.iconButton} aria-label={`${item.label} 기록 삭제`} onClick={() => { if (confirm(`${item.label}의 누적 기록을 삭제할까요?`)) command('remove', { id: item.id }); }}><FiTrash2 size={13} /></button>
    </article>)}</div>}
    {!state.targets.length && <div className={styles.emptyState}><strong>작업시간을 자동으로 모아 보세요</strong><span>프로그램 추가를 누르고 미리보기에서 기록할 창을 선택하세요.</span></div>}
    <p className={styles.message}>선택한 프로그램이 활성화된 시간만 기록합니다. 잠금·절전 중에는 멈춥니다. 탭은 창 제목으로 구분합니다.</p>
    {!state.supported && <p className={styles.message}>프로그램 감지는 Windows에서 지원됩니다.</p>}
  </div>;
}
