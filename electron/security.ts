import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function trustedAppPage(address: string): boolean {
  try {
    const url = new URL(address);
    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
      return url.origin === 'http://localhost:5173' && url.pathname === '/';
    }
    url.search = ''; url.hash = '';
    return url.href === pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
  } catch { return false; }
}

export function assertTrustedSender(event: IpcMainInvokeEvent) {
  const frame = event.senderFrame;
  if (!frame || frame !== event.sender.mainFrame || !BrowserWindow.fromWebContents(event.sender)
    || !trustedAppPage(frame.url)) throw new Error('허용되지 않은 앱 접근입니다.');
}

// Install before registering handlers, including handlers registered after app readiness.
export function guardIpcHandlers() {
  const handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, listener) => handle(channel, (event, ...args) => {
    assertTrustedSender(event);
    return listener(event, ...args);
  });
}

export function protectContents(contents: WebContents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', event => event.preventDefault());
  contents.on('will-attach-webview', event => event.preventDefault());
}

export function safeExternalUrl(address: unknown): string {
  if (typeof address !== 'string' || address.length > 2048) throw new Error('잘못된 외부 링크입니다.');
  const url = new URL(address);
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || !['github.com', 'tasks.google.com'].includes(url.hostname)) throw new Error('허용되지 않은 외부 링크입니다.');
  return url.href;
}
