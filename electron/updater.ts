import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
export interface UpdateStatus { status: 'idle' | 'checking' | 'current' | 'downloading' | 'ready' | 'error' | 'unsupported'; version?: string; percent?: number; message?: string }
export function registerUpdater() {
  let state: UpdateStatus = { status: 'idle' };
  let flight: Promise<UpdateStatus> | undefined;
  const supported = app.isPackaged && process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR;
  if (!supported) state = { status: 'unsupported' };
  const emit = (next: UpdateStatus) => { state = next; for (const win of BrowserWindow.getAllWindows()) win.webContents.send('update-changed', state); };
  autoUpdater.setFeedURL({ provider: 'github', owner: 'bokmunssu', repo: 'BOK-CALD' });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('checking-for-update', () => emit({ status: 'checking' }));
  autoUpdater.on('update-available', info => emit({ status: 'downloading', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', progress => emit({ status: 'downloading', version: state.version, percent: Math.floor(progress.percent) }));
  autoUpdater.on('update-not-available', info => emit({ status: 'current', version: info.version }));
  autoUpdater.on('update-downloaded', info => emit({ status: 'ready', version: info.version }));
  autoUpdater.on('error', () => emit({ status: 'error', message: '업데이트를 확인하거나 다운로드하지 못했습니다. 네트워크 및 릴리즈의 latest.yml·설치 파일을 확인해 주세요.' }));
  const check = async (): Promise<UpdateStatus> => {
    if (!supported) return { status: 'unsupported', message: '자동 업데이트는 Windows 설치형에서 지원합니다. 포터블·개발 빌드는 릴리즈에서 새 파일을 받으세요.' };
    if (state.status === 'ready' || state.status === 'downloading') return state;
    return flight ??= autoUpdater.checkForUpdates().then(() => state).catch(() => state).finally(() => { flight = undefined; });
  };
  ipcMain.handle('update-status', () => state);
  ipcMain.handle('update-check', check);
  ipcMain.handle('update-install', () => { if (state.status !== 'ready' || !supported) throw new Error('다운로드가 완료된 업데이트가 없습니다.'); autoUpdater.quitAndInstall(false, true); });
  if (supported && !process.env.TOMO_TEST_USER_DATA) { const timer = setTimeout(() => { void check(); }, 30000); timer.unref(); }
}
