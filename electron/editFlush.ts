import { app, BrowserWindow, ipcMain } from 'electron';
let sequence = 0; let quitting = false; let waitingToQuit = false;
const requests = new Map<number, { sender: number; finish: (saved: boolean) => void }>();
const guarded = new Set<BrowserWindow>();
ipcMain.on('edits-flushed', (event, id: number, saved: boolean) => { const request = requests.get(id); if (request?.sender === event.sender.id) request.finish(saved); });
function flushWindow(win: BrowserWindow): Promise<boolean> {
  if (win.isDestroyed() || win.webContents.isDestroyed() || win.webContents.isCrashed() || win.webContents.isLoadingMainFrame()) return Promise.resolve(true);
  return new Promise(resolve => {
    const id = ++sequence;
    const timer = setTimeout(() => finish(false), 5000);
    const finish = (saved: boolean) => { clearTimeout(timer); requests.delete(id); resolve(saved); };
    requests.set(id, { sender: win.webContents.id, finish });
    win.webContents.send('flush-edits', id);
  });
}
export function guardEditFlush(win: BrowserWindow) {
  guarded.add(win); win.on('closed', () => guarded.delete(win));
  let closing = false; let allowed = false;
  win.on('close', event => {
    if (quitting || allowed) return;
    event.preventDefault(); if (closing) return;
    closing = true;
    void flushWindow(win).then(saved => { closing = false; if (saved && !win.isDestroyed()) { allowed = true; win.close(); } });
  });
}
app.on('before-quit', event => {
  if (quitting) return;
  event.preventDefault(); if (waitingToQuit) return;
  waitingToQuit = true;
  void Promise.all([...guarded].map(flushWindow)).then(results => {
    waitingToQuit = false;
    if (results.every(Boolean)) { quitting = true; app.quit(); }
  });
});
