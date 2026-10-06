import { describe, it, expect, vi } from 'vitest';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
vi.mock('electron', () => ({ app: { isPackaged: true }, BrowserWindow: { fromWebContents: () => ({}) }, ipcMain: { handle: vi.fn() } }));
import { trustedAppPage, safeExternalUrl, assertTrustedSender, guardIpcHandlers } from '../../electron/security';
import { ipcMain } from 'electron';

describe('desktop trust boundary', () => {
  it('trusts only the packaged app entry, including widget query strings', () => {
    const entry = pathToFileURL(path.resolve('dist/index.html')).href;
    expect(trustedAppPage(entry + '?widget=memo')).toBe(true);
    for (const url of ['file:///C:/Users/Public/evil.html', 'https://evil.example/', 'http://localhost:5173/', entry + '/evil']) expect(trustedAppPage(url)).toBe(false);
  });
  it('rejects unsafe schemes, credentials and unexpected external hosts', () => {
    expect(safeExternalUrl('https://github.com/bokmunssu/BOK-CALD/releases')).toContain('github.com');
    for (const url of ['file:///C:/Windows/notepad.exe', 'javascript:alert(1)', 'ms-msdt:evil', 'http://github.com/', 'https://github.com.evil.example/', 'https://user@github.com/', 'https://github.com:444/']) expect(() => safeExternalUrl(url)).toThrow();
  });
  it('rejects IPC from subframes or unrelated pages before running the operation', () => {
    const frame = { url: pathToFileURL(path.resolve('dist/index.html')).href };
    const good = { senderFrame: frame, sender: { mainFrame: frame } };
    expect(() => assertTrustedSender(good as any)).not.toThrow();
    expect(() => assertTrustedSender({ ...good, senderFrame: { ...frame } } as any)).toThrow();
    expect(() => assertTrustedSender({ ...good, senderFrame: null } as any)).toThrow();
    const original = vi.mocked(ipcMain.handle);
    guardIpcHandlers(); const operation = vi.fn(); ipcMain.handle('test', operation);
    const guarded = original.mock.calls.at(-1)![1];
    expect(() => guarded({ ...good, senderFrame: null } as any)).toThrow();
    expect(operation).not.toHaveBeenCalled();
    guarded(good as any); expect(operation).toHaveBeenCalledOnce();
  });
});
