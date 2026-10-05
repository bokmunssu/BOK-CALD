import { useRecoilState } from 'recoil';
import { FiCheckSquare, FiClock, FiEdit3, FiSun } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { workspaceSettingsState } from '../../store/workspace';
import styles from './Widgets.module.scss';
import type { WidgetKind } from '../../utils/workspace';
import Notes from './Notes';
import PinButton from './PinButton';

export function openWidget(kind: WidgetKind, id?: string) {
  if (!window.electronAPI?.openWidget) { toast.error('독립 위젯은 데스크톱 앱에서 열 수 있습니다.'); return; }
  window.electronAPI.openWidget(kind, id).catch(error => toast.error(error.message || '위젯을 열지 못했습니다.'));
}
export default function WorkspaceControls() {
  const [settings, setSettings] = useRecoilState(workspaceSettingsState);
  return <div className={styles.workspaceBar}>
    <PinButton /><label className={styles.compactToggle}><input type="checkbox" checked={settings.simple} onChange={e => setSettings(s => ({ ...s, simple: e.target.checked }))} />심플 모드</label>
    <label className={styles.compactToggle} title="한국 공휴일 날짜를 빨간색으로 표시"><input aria-label="한국 공휴일 표시" type="checkbox" checked={settings.koreanHolidays} onChange={e => setSettings(s => ({ ...s, koreanHolidays: e.target.checked }))} /><FiSun />공휴일</label>
    <span className={styles.spacer} /><button onClick={() => openWidget('todo')}><FiCheckSquare />할 일</button>
    <button onClick={() => openWidget('pomodoro')}><FiClock />뽀모도로</button><button onClick={() => openWidget('worktime')}><FiClock />작업시간</button>
    <details className={styles.notesMenu}><summary><FiEdit3 />메모</summary><div className={`${styles.popover} ${styles.notePopover}`}><Notes /></div></details>
  </div>;
}
