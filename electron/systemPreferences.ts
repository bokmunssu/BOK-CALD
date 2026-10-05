import { app, ipcMain, desktopCapturer, BrowserWindow } from 'electron';
import { WindowInventory } from './windowInventory';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const powershell = async (script: string) => {
  const { stdout } = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from('[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n' + script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(stdout.replace(/^\uFEFF/, '').trim() || '[]');
};
let fontFlight: Promise<string[]> | undefined;
let windowFlight: Promise<unknown> | undefined;
let windowCache: { value: unknown; at: number } | undefined;
export function registerSystemPreferences() {
  const inventory = new WindowInventory(); inventory.start();
  app.on('before-quit', () => inventory.stop());
  ipcMain.handle('system-fonts', () => fontFlight ??= loadFonts().catch(error => { fontFlight = undefined; throw error; }));
  async function loadFonts() {
    if (process.platform !== 'win32') throw new Error('폰트 목록은 현재 Windows에서 지원합니다. 폰트 이름을 직접 입력할 수 있습니다.');
    const fonts = await powershell("Add-Type -AssemblyName System.Drawing\n$f = New-Object System.Drawing.Text.InstalledFontCollection\n@($f.Families | ForEach-Object { $_.Name } | Sort-Object -Unique) | ConvertTo-Json -Compress");
    return Array.isArray(fonts) ? fonts : [fonts];
  }
  ipcMain.handle('system-windows', async () => {
    if (windowCache && Date.now() - windowCache.at < 2000) return windowCache.value;
    return windowFlight ??= loadWindows().then(value => { windowCache = { value, at: Date.now() }; return value; }).finally(() => { windowFlight = undefined; });
  });
  async function loadWindows() {
    if (process.platform !== 'win32') throw new Error('프로그램/창 선택은 현재 Windows에서 지원합니다.');
    const [sources, processRows] = await Promise.all([
      desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 160, height: 94 }, fetchWindowIcons: false }),
      inventory.read()
    ]);
    const rows = Array.isArray(processRows) ? processRows : [processRows];
    const processes = new Map(rows.map((row: {handle: string; processName: string}) => [row.handle, row.processName]));
    const ownHandles = new Set(BrowserWindow.getAllWindows().map(w => {
      const b = w.getNativeWindowHandle(); return b.length >= 8 ? b.readBigUInt64LE().toString() : b.readUInt32LE().toString();
    }));
    return sources.filter(s => !ownHandles.has(s.id.split(':')[1]) && processes.has(s.id.split(':')[1])).map(s => ({
      id: s.id, title: s.name, processName: processes.get(s.id.split(':')[1]),
      thumbnail: s.thumbnail.toDataURL(), icon: s.appIcon?.toDataURL()
    }));
  }
}
