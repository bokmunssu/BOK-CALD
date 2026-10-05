import { useRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { workspaceSettingsState } from '../../store/workspace';
import styles from './Widgets.module.scss';
import type { WidgetKind } from '../../utils/workspace';
import Notes from './Notes';

export function openWidget(kind: WidgetKind, id?: string) {
  if (!window.electronAPI?.openWidget) { toast.error('독립 위젯은 데스크톱 앱에서 열 수 있습니다.'); return; }
  window.electronAPI.openWidget(kind, id).catch(() => toast.error('위젯을 열지 못했습니다.'));
}
export default function WorkspaceControls() {
  const [settings, setSettings] = useRecoilState(workspaceSettingsState);
  return <div className={styles.workspaceBar}>
    <label><input type="checkbox" checked={settings.simple}
      onChange={e => setSettings(s => ({ ...s, simple: e.target.checked }))} /> 심플 모드</label>
    <details><summary>배너 설정</summary><div className={styles.popover}>
      <label><input type="checkbox" checked={settings.bannerVisible}
        onChange={e => setSettings(s => ({ ...s, bannerVisible: e.target.checked }))} /> 배너 표시</label>
      <label>배너 높이 {settings.bannerHeight}px<input aria-label="배너 높이" type="range" min="40" max="240" step="10"
        value={settings.bannerHeight} onChange={e => setSettings(s => ({ ...s, bannerHeight: Number(e.target.value) }))} /></label>
      {settings.simple && <small>심플 모드를 끄면 배너와 꾸미기가 다시 보입니다.</small>}
    </div></details>
    <span className={styles.spacer} />
    <span>위젯</span>
    <button onClick={() => openWidget('todo')}>할 일</button>
    <button onClick={() => openWidget('dday')}>디데이</button>
    <button onClick={() => openWidget('pomodoro')}>뽀모도로</button>
    <details><summary>메모장</summary><div className={styles.popover} style={{ left: 'auto', right: 0, maxHeight: '65vh', overflow: 'auto' }}><Notes /></div></details>
  </div>;
}
