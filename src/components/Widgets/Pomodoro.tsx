import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { defaultTimer, TimerState } from '../../utils/workspace';
import styles from './Widgets.module.scss';

export default function Pomodoro() {
  const [timer, setTimer] = useState<TimerSnapshot>({ ...defaultTimer, targetActive: false, focusSupported: false });
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const api = window.electronAPI?.timer;
    if (!api) return;
    let alive = true;
    const unsubscribe = api.subscribe(value => { if (alive) setTimer(value); });
    api.get().then(value => { if (alive) { setTimer(value); setReady(true); } }).catch(() => toast.error('타이머를 불러오지 못했습니다.'));
    return () => { alive = false; unsubscribe(); };
  }, []);
  const command = async (action: 'start' | 'pause' | 'reset' | 'configure', value?: Partial<TimerState>) => {
    try { setTimer(await window.electronAPI.timer.command(action, value)); }
    catch (error) { toast.error(String(error)); }
  };
  const seconds = Math.ceil(timer.remainingMs / 1000);
  return <div className={styles.timer}>
    <strong>{timer.phase === 'focus' ? '집중' : '휴식'} · {timer.sessions}회 완료</strong>
    <output className={styles.clock} aria-label="남은 시간">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</output>
    <p role="status">{!timer.running ? '일시정지' : timer.phase === 'focus' && timer.gated && !timer.targetActive ? '지정한 창을 활성화하면 시간이 흐릅니다.' : '진행 중'}</p>
    <div className={styles.actions}>
      <button disabled={!ready || capturing || (!timer.running && timer.gated && !timer.target)} onClick={() => command(timer.running ? 'pause' : 'start')}>{timer.running ? '일시정지' : '시작'}</button>
      <button disabled={!ready || capturing} onClick={() => command('reset')}>초기화</button>
    </div>
    <label>집중(분) <input aria-label="집중 시간" disabled={timer.running || !ready} type="number" min="1" max="180" value={timer.focusMinutes}
      onChange={e => command('configure', { focusMinutes: Number(e.target.value) })} /></label>
    <label>휴식(분) <input aria-label="휴식 시간" disabled={timer.running || !ready} type="number" min="1" max="180" value={timer.breakMinutes}
      onChange={e => command('configure', { breakMinutes: Number(e.target.value) })} /></label>
    <label><input type="checkbox" checked={timer.gated} disabled={!timer.focusSupported || timer.running}
      onChange={e => command('configure', { gated: e.target.checked })} /> 지정한 프로그램/탭에서만 집중</label>
    {!timer.focusSupported && <small>활성 창 감지는 Windows 데스크톱 앱에서 지원됩니다.</small>}
    {timer.focusSupported && <>
      <button disabled={capturing || timer.running} onClick={async () => {
        setCapturing(true);
        try { const active = await window.electronAPI.timer.capture(); await command('configure', { target: { ...active, mode: 'program' } }); }
        catch (error) { toast.error(String(error)); } finally { setCapturing(false); }
      }}>{capturing ? '지정할 프로그램/탭으로 전환하세요…' : '4초 후 활성 창 지정'}</button>
      {timer.target && <>
        <small>프로그램: {timer.target.processName}</small>
        <select aria-label="집중 대상 구분" disabled={timer.running} value={timer.target.mode}
          onChange={e => command('configure', { target: { ...timer.target!, mode: e.target.value as 'program' | 'title' } })}>
          <option value="program">이 프로그램의 모든 창</option><option value="title">이 탭/창 제목만</option>
        </select>
        {timer.target.mode === 'title' && <small>제목: {timer.target.title}<br />활성 탭의 제목이 정확히 같을 때만 측정합니다. 제목이 바뀌면 다시 지정해 주세요.</small>}
      </>}
    </>}
    <small className={styles.message}>설정 변경 시 현재 구간을 초기화합니다. 휴식은 대상 제한 없이 진행되며, 구간이 끝나면 다음 구간을 직접 시작합니다.</small>
  </div>;
}
