import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ handlers: new Map<string, (...args: any[]) => any>(), events: new Map<string, (...args: any[]) => void>(), send: vi.fn(), app: { isPackaged: true }, updater: { setFeedURL: vi.fn(), checkForUpdates: vi.fn(), quitAndInstall: vi.fn(), autoDownload: false, autoInstallOnAppQuit: true, allowPrerelease: true } }));
vi.mock('electron', () => ({ app: mocks.app, BrowserWindow: { getAllWindows: () => [{ webContents: { send: mocks.send } }] }, ipcMain: { handle: (name: string, fn: (...args: any[]) => any) => mocks.handlers.set(name, fn) } }));
vi.mock('electron-updater', () => ({ autoUpdater: { ...mocks.updater, on: (name: string, fn: (...args: any[]) => void) => mocks.events.set(name, fn) } }));
import { autoUpdater } from 'electron-updater';
import { registerUpdater } from '../../electron/updater';
beforeEach(() => { vi.clearAllMocks(); mocks.handlers.clear(); mocks.events.clear(); mocks.app.isPackaged = true; vi.stubEnv('TOMO_TEST_USER_DATA','updater-test'); vi.stubEnv('PORTABLE_EXECUTABLE_DIR',''); });
afterEach(() => vi.unstubAllEnvs());
describe('Windows installer updates', () => {
  it('uses this repository, downloads automatically and installs only after readiness', async () => {
    registerUpdater();
    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({provider:'github',owner:'bokmunssu',repo:'BOK-CALD'});
    expect(autoUpdater.autoDownload).toBe(true);
    expect(autoUpdater.autoInstallOnAppQuit).toBe(false);
    expect(() => mocks.handlers.get('update-install')!()).toThrow();
    mocks.events.get('update-available')!({version:'2.3.0'});
    mocks.events.get('download-progress')!({percent:49.9});
    expect(await mocks.handlers.get('update-check')!()).toMatchObject({status:'downloading',percent:49});
    mocks.events.get('update-downloaded')!({version:'2.3.0'});
    mocks.handlers.get('update-install')!();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false,true);
  });
  it('does not attempt automatic installation for portable or development builds', async () => {
    vi.stubEnv('PORTABLE_EXECUTABLE_DIR','portable'); registerUpdater();
    expect(await mocks.handlers.get('update-check')!()).toMatchObject({status:'unsupported'});
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
  it('shares in-flight checks and reports failures without claiming the latest version', async () => {
    registerUpdater();
    let settle!: () => void;
    vi.mocked(autoUpdater.checkForUpdates).mockImplementation(() => new Promise(resolve => { settle = () => { mocks.events.get('update-not-available')!({version:'2.2.0'}); resolve(null); }; }));
    const a = mocks.handlers.get('update-check')!(); const b = mocks.handlers.get('update-check')!(); settle();
    expect(await a).toMatchObject({status:'current'}); await b;
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    mocks.events.get('error')!(new Error('private URL'));
    expect(mocks.handlers.get('update-status')!()).toMatchObject({status:'error'});
    expect(JSON.stringify(mocks.handlers.get('update-status')!())).not.toContain('private URL');
  });
});
