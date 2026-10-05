import { ipcMain, desktopCapturer, BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const powershell = async (script: string) => {
  const { stdout } = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from('[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n' + script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(stdout.replace(/^\uFEFF/, '').trim() || '[]');
};
export function registerSystemPreferences() {
  ipcMain.handle('system-fonts', async () => {
    if (process.platform !== 'win32') throw new Error('폰트 목록은 현재 Windows에서 지원합니다. 폰트 이름을 직접 입력할 수 있습니다.');
    const fonts = await powershell("Add-Type -AssemblyName System.Drawing\n$f = New-Object System.Drawing.Text.InstalledFontCollection\n@($f.Families | ForEach-Object { $_.Name } | Sort-Object -Unique) | ConvertTo-Json -Compress");
    return Array.isArray(fonts) ? fonts : [fonts];
  });
  ipcMain.handle('system-windows', async () => {
    if (process.platform !== 'win32') throw new Error('프로그램/창 선택은 현재 Windows에서 지원합니다.');
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 240, height: 140 }, fetchWindowIcons: true });
    const processRows = await powershell(`Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class TomoWindows {
  public delegate bool Callback(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback, IntPtr p);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public static Dictionary<string,uint> List() {
    var result = new Dictionary<string,uint>();
    EnumWindows((h,p) => { if (IsWindowVisible(h)) { uint id; GetWindowThreadProcessId(h, out id); result[h.ToInt64().ToString()] = id; } return true; }, IntPtr.Zero);
    return result;
  }
}
'@
$taskProcesses = @{}
Get-Process | ForEach-Object { $taskProcesses[[uint32]$_.Id] = $_.ProcessName }
@([TomoWindows]::List().GetEnumerator() | ForEach-Object {
  if ($taskProcesses.ContainsKey($_.Value)) { @{ handle=$_.Key; processName=$taskProcesses[$_.Value] } }
}) | ConvertTo-Json -Compress`);
    const rows = Array.isArray(processRows) ? processRows : [processRows];
    const processes = new Map(rows.map((row: {handle: string; processName: string}) => [row.handle, row.processName]));
    const ownHandles = new Set(BrowserWindow.getAllWindows().map(w => {
      const b = w.getNativeWindowHandle(); return b.length >= 8 ? b.readBigUInt64LE().toString() : b.readUInt32LE().toString();
    }));
    return sources.filter(s => !ownHandles.has(s.id.split(':')[1]) && processes.has(s.id.split(':')[1])).map(s => ({
      id: s.id, title: s.name, processName: processes.get(s.id.split(':')[1]),
      thumbnail: s.thumbnail.toDataURL(), icon: s.appIcon?.toDataURL()
    }));
  });
}
