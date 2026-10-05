import { useEffect, useState } from 'react';
import { FiPlay, FiPause, FiSquare, FiSettings, FiRepeat, FiCrosshair } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { defaultTimer, TimerState } from '../../utils/workspace';
import styles from './Widgets.module.scss';

export default function Pomodoro() {
  const [timer, setTimer] = useState<TimerSnapshot>({ ...defaultTimer, targetActive: false, focusSupported: false });
  const [capturing, setCapturing] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => {
    const api = window.electronAPI?.timer; if (!api) return;
    let alive = true;
    const unsubscribe = api.subscribe(value => { if (alive) setTimer(value); });
    api.get().then(value => { if (alive) { setTimer(value); setReady(true); } }).catch(() => toast.error('타이머를 불러오지 못했습니다.'));
    return () => { alive = false; unsubscribe(); };
  }, []);
  const command = async (action: 'start' | 'pause' | 'reset' | 'configure', value?: Partial<TimerState>) => {
    try { setTimer(await window.electronAPI.timer.command(action, value)); } catch (error) { toast.error(String(error)); }
  };
  const seconds = Math.ceil(timer.remainingMs / 1000);
  const total = (timer.phase === 'focus' ? timer.focusMinutes : timer.breakMinutes) * 60000;
  const progress = Math.min(1, Math.max(0, timer.remainingMs / total));
  const circumference = 2 * Math.PI * 112;
  const status = !timer.running ? '시작할 준비가 됐어요' : timer.phase === 'focus' && timer.gated && !timer.targetActive ? '집중할 창으로 돌아가 주세요' : timer.phase === 'focus' ? '지금, 한 가지에 집중하세요' : '잠깐 쉬어 가세요';
  return <div className={styles.timer}>
    <div className={styles.timerModes}><button aria-pressed={timer.phase === 'focus'} disabled={timer.running} onClick={() => command('configure', { phase: 'focus' })}>집중 {timer.focusMinutes}분</button><button aria-pressed={timer.phase === 'break'} disabled={timer.running} onClick={() => command('configure', { phase: 'break' })}>휴식 {timer.breakMinutes}분</button></div>
    <div className={styles.timerDial}>
      <svg viewBox="0 0 256 256" aria-hidden="true"><circle className={styles.ringTrack} cx="128" cy="128" r="112" /><circle className={styles.ringProgress} cx="128" cy="128" r="112" strokeDasharray={circumference} strokeDashoffset={circumference * (1-progress)} /></svg>
      <div className={styles.dialCenter}><span>{timer.phase === 'focus' ? 'FOCUS' : 'BREAK'}</span><output aria-label="남은 시간">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</output><small role="status">{status}</small></div>
    </div>
    <div className={styles.timerActions}>
      <button className={styles.playButton} aria-label={timer.running ? '일시정지' : '시작'} title={timer.running ? '일시정지' : '시작'} disabled={!ready || capturing || (!timer.running && timer.gated && !timer.target)} onClick={() => command(timer.running ? 'pause' : 'start')}>{timer.running ? <FiPause /> : <FiPlay />}</button>
      <button className={styles.iconButton} aria-label="초기화" title="초기화" disabled={!ready || capturing} onClick={() => command('reset')}><FiSquare /></button>
      <button className={styles.iconButton} aria-label="집중 휴식 전환" title="집중·휴식 전환" disabled={timer.running || !ready} onClick={() => command('configure', { phase: timer.phase === 'focus' ? 'break' : 'focus' })}><FiRepeat /></button>
      <details className={styles.timerSettings}><summary title="뽀모도로 설정" aria-label="뽀모도로 설정"><FiSettings /></summary><div className={styles.timerSettingsBody}>
        <div className={styles.durationSettings}><label>집중<input aria-label="집중 시간" disabled={timer.running || !ready} type="number" min="1" max="180" value={timer.focusMinutes} onChange={e => command('configure', { focusMinutes: Number(e.target.value) })} />분</label><label>휴식<input aria-label="휴식 시간" disabled={timer.running || !ready} type="number" min="1" max="180" value={timer.breakMinutes} onChange={e => command('configure', { breakMinutes: Number(e.target.value) })} />분</label></div>
        <label className={styles.compactToggle}><input type="checkbox" checked={timer.gated} disabled={!timer.focusSupported || timer.running} onChange={e => command('configure', { gated: e.target.checked })} />지정한 프로그램/탭에서만 집중</label>
        {timer.focusSupported && <><button disabled={capturing || timer.running} onClick={async () => {
          setCapturing(true); try { const active = await window.electronAPI.timer.capture(); await command('configure', { target: { ...active, mode: 'program' } }); } catch (error) { toast.error(String(error)); } finally { setCapturing(false); }
        }}><FiCrosshair />{capturing ? '대상 창으로 전환하세요…' : '4초 후 활성 창 지정'}</button>
        {timer.target && <><small className={styles.message}>{timer.target.processName}</small><select aria-label="집중 대상 구분" disabled={timer.running} value={timer.target.mode} onChange={e => command('configure', { target: { ...timer.target!, mode: e.target.value as 'program' | 'title' } })}><option value="program">이 프로그램 전체</option><option value="title">이 탭/창 제목만</option></select>{timer.target.mode === 'title' && <small className={styles.message}>{timer.target.title}</small>}</>}</>}
        <small className={styles.message}>설정 변경 시 현재 구간을 초기화합니다. 휴식은 대상 제한 없이 진행됩니다. 각 구간은 직접 시작합니다.</small>
        {!timer.focusSupported && <small className={styles.message}>활성 창 감지는 Windows에서 지원됩니다.</small>}
      </div></details>
    </div>
    <small className={styles.timerSessions}>완료한 집중 <b>{timer.sessions}</b>회</small>
  </div>;
}
