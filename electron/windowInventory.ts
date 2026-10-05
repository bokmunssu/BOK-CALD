import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
const script = `
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
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
while ($null -ne ($request = [Console]::ReadLine())) {
  if ($request -ne 'windows') { continue }
  try {
    $taskProcesses = @{}
    Get-Process | ForEach-Object { $taskProcesses[[uint32]$_.Id] = $_.ProcessName }
    $taskRows = @([TomoWindows]::List().GetEnumerator() | ForEach-Object {
      if ($taskProcesses.ContainsKey($_.Value)) { @{ handle=$_.Key; processName=$taskProcesses[$_.Value] } }
    })
    [Console]::WriteLine((ConvertTo-Json -InputObject $taskRows -Compress))
  } catch { [Console]::WriteLine('[]') }
}
`;
// Compile the Windows API helper once. Requests contain a constant command only;
// window titles are never executed or retained by this worker.
export class WindowInventory {
  private child: ChildProcessWithoutNullStreams | undefined;
  private pending: { resolve: (rows: { handle: string; processName: string }[]) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout } | undefined;
  start() {
    if (this.child || process.platform !== 'win32') return;
    const child = spawn('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], { windowsHide: true });
    this.child = child; let buffer = '';
    child.stdout.on('data', chunk => {
      buffer += chunk.toString('utf8');
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0,index).replace(/^\uFEFF/,'').trim(); buffer = buffer.slice(index+1);
        if (!this.pending) continue;
        const pending = this.pending; this.pending = undefined; clearTimeout(pending.timeout);
        try { pending.resolve(JSON.parse(line)); } catch { pending.reject(new Error('창 목록 응답을 읽지 못했습니다.')); }
      }
    });
    child.stderr.resume();
    const stopped = () => { if (this.child === child) { this.child = undefined; if (this.pending) { clearTimeout(this.pending.timeout); this.pending.reject(new Error('창 목록 조회가 중단되었습니다. 다시 시도해 주세요.')); this.pending = undefined; } } };
    child.on('error',stopped); child.on('exit',stopped);
  }
  read() {
    this.start();
    return new Promise<{ handle: string; processName: string }[]>((resolve,reject) => {
      if (this.pending || !this.child) { reject(new Error('창 목록 조회를 다시 시도해 주세요.')); return; }
      const timeout = setTimeout(() => { this.stop(); },15000);
      this.pending = { resolve,reject,timeout }; this.child.stdin.write('windows\n');
    });
  }
  stop() { const child = this.child; this.child = undefined; child?.kill(); if (this.pending) { clearTimeout(this.pending.timeout); this.pending.reject(new Error('창 목록 조회가 중단되었습니다.')); this.pending = undefined; } }
}
