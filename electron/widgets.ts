import { app, BrowserWindow, ipcMain, Notification, powerMonitor, screen } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { performance } from 'node:perf_hooks';
import { advanceTimer, defaultTimer, matchesTarget, TimerState, WidgetKind, FocusTarget } from '../src/utils/workspace';
import { ForegroundMonitor } from './foreground';

export function registerWidgets(store: Store, openCalendar: () => void) {
  const windows = new Map<string, BrowserWindow>();
  const monitor = new ForegroundMonitor();
  const saved = store.get('pomodoroConfig') as Partial<TimerState> | undefined;
  let timer: TimerState = { ...defaultTimer,
    focusMinutes: minutes(saved?.focusMinutes, 25), breakMinutes: minutes(saved?.breakMinutes, 5),
    gated: saved?.gated === true && process.platform === 'win32', target: validTarget(saved?.target) };
  timer.remainingMs = timer.focusMinutes * 60000;
  let lastTick = performance.now();
  let capturing = false;
  let wasActive = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  const snapshot = () => ({ ...timer, targetActive: matchesTarget(timer.target, monitor.read()),
    focusSupported: process.platform === 'win32' });
  const broadcast = () => {
    for (const [id, win] of windows) if (id === 'pomodoro' && !win.isDestroyed()) win.webContents.send('timer-changed', snapshot());
  };
  function updateMonitoring() {
    if (capturing || (timer.running && timer.gated && timer.phase === 'focus')) monitor.start();
    else monitor.stop();
    if (timer.running && !interval) {
      lastTick = performance.now(); wasActive = false;
      interval = setInterval(() => {
        const now = performance.now(); const elapsed = now - lastTick; lastTick = now;
        const active = matchesTarget(timer.target, monitor.read());
        const before = timer.phase;
        // Never count sleep/resume or a stalled sample as focus time.
        timer = advanceTimer(timer, elapsed < 2000 ? elapsed : 0, active && wasActive);
        wasActive = active;
        if (before !== timer.phase) {
          if (Notification.isSupported()) new Notification({ title: 'BOK-CALD',
            body: timer.phase === 'break' ? '집중 완료! 휴식을 시작해 주세요.' : '휴식 완료! 다음 집중을 시작해 주세요.' }).show();
          updateMonitoring();
        }
        broadcast();
      }, 500);
    } else if (!timer.running && interval) { clearInterval(interval); interval = undefined; }
  }
  function pause() { timer = { ...timer, running: false }; updateMonitoring(); broadcast(); }
  powerMonitor.on('suspend', pause);
  powerMonitor.on('lock-screen', pause);
  app.on('before-quit', () => { pause(); monitor.stop(); });

  ipcMain.handle('widget-open', async (_, kind: WidgetKind, memoId?: string) => {
    if (!['todo', 'memo', 'dday', 'pomodoro'].includes(kind)) throw new Error('지원하지 않는 위젯입니다.');
    if (kind === 'memo' && (!memoId || !/^[\w-]{1,100}$/.test(memoId))) throw new Error('메모를 먼저 선택해 주세요.');
    const id = kind === 'memo' ? `memo-${memoId}` : kind;
    const existing = windows.get(id);
    if (existing) { existing.show(); existing.restore(); existing.focus(); return; }
    const savedBounds = store.get(`widgets.${id}.bounds`) as Electron.Rectangle | undefined;
    const display = screen.getPrimaryDisplay().workArea;
    const width = Math.min(display.width, Math.max(300, savedBounds?.width || 360));
    const height = Math.min(display.height, Math.max(240, savedBounds?.height || 480));
    const visible = savedBounds && screen.getAllDisplays().some(d =>
      savedBounds.x >= d.workArea.x && savedBounds.y >= d.workArea.y &&
      savedBounds.x + width <= d.workArea.x + d.workArea.width && savedBounds.y + 60 <= d.workArea.y + d.workArea.height);
    const win = new BrowserWindow({ width, height, ...(visible ? { x: savedBounds.x, y: savedBounds.y } : {}),
      minWidth: 300, minHeight: 240, title: `BOK-CALD · ${kind}`, autoHideMenuBar: true,
      alwaysOnTop: store.get(`widgets.${id}.pinned`) === true,
      backgroundColor: '#fafafa',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true,
        nodeIntegration: false, backgroundThrottling: false } });
    windows.set(id, win);
    if (store.get(`widgets.${id}.pinned`) === true) win.setAlwaysOnTop(true, process.platform === 'win32' ? 'pop-up-menu' : 'floating');
    win.on('close', () => store.set(`widgets.${id}.bounds`, win.getBounds()));
    win.on('closed', () => { windows.delete(id); if (kind === 'pomodoro') pause(); });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    const query = { widget: kind, ...(memoId ? { memoId } : {}) };
    if (process.env.NODE_ENV === 'development') await win.loadURL(`http://localhost:5173/?${new URLSearchParams(query)}`);
    else await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query });
  });
  ipcMain.handle('calendar-open', () => openCalendar());
  ipcMain.handle('window-pinned', event => BrowserWindow.fromWebContents(event.sender)?.isAlwaysOnTop() ?? false);
  ipcMain.handle('window-pin', (event, pinned: boolean) => {
    if (typeof pinned !== 'boolean') throw new Error('잘못된 고정 설정');
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setAlwaysOnTop(pinned, process.platform === 'win32' ? 'pop-up-menu' : 'floating');
    for (const [id, widget] of windows) if (widget === win) store.set(`widgets.${id}.pinned`, pinned);
    return win?.isAlwaysOnTop() ?? false;
  });
  ipcMain.handle('timer-get', () => snapshot());
  ipcMain.handle('timer-command', (_, command: string, value?: Partial<TimerState>) => {
    if (command === 'start') {
      if (timer.gated && !timer.target) throw new Error('먼저 집중 대상을 지정해 주세요.');
      timer = { ...timer, running: true };
    } else if (command === 'pause') timer = { ...timer, running: false };
    else if (command === 'reset') timer = { ...timer, running: false, phase: 'focus', remainingMs: timer.focusMinutes * 60000 };
    else if (command === 'configure' && value) {
      timer = { ...timer, running: false,
        focusMinutes: minutes(value.focusMinutes, timer.focusMinutes),
        breakMinutes: minutes(value.breakMinutes, timer.breakMinutes),
        gated: typeof value.gated === 'boolean' ? value.gated && process.platform === 'win32' : timer.gated,
        target: value.target === undefined ? timer.target : validTarget(value.target) };
      timer.remainingMs = (timer.phase === 'focus' ? timer.focusMinutes : timer.breakMinutes) * 60000;
      store.set('pomodoroConfig', { focusMinutes: timer.focusMinutes, breakMinutes: timer.breakMinutes,
        gated: timer.gated, target: timer.target });
    } else throw new Error('잘못된 타이머 명령');
    updateMonitoring(); broadcast(); return snapshot();
  });
  ipcMain.handle('focus-capture', async () => {
    if (process.platform !== 'win32') throw new Error('활성 창 감지는 Windows에서 지원됩니다.');
    if (capturing) throw new Error('대상 지정이 진행 중입니다.');
    capturing = true; updateMonitoring();
    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const active = monitor.read();
      if (!active) throw new Error('활성 창을 감지하지 못했습니다. 다시 시도해 주세요.');
      return active;
    } finally { capturing = false; updateMonitoring(); }
  });
}
function minutes(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(180, Math.round(value))) : fallback;
}
function validTarget(value: unknown): FocusTarget | null {
  const t = value as FocusTarget | null;
  return t && typeof t.processName === 'string' && typeof t.title === 'string' &&
    ['program', 'title'].includes(t.mode) ? { processName: t.processName.slice(0, 200), title: t.title.slice(0, 2048), mode: t.mode } : null;
}
