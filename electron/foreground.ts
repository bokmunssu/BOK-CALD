import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import type { ForegroundWindow } from '../src/utils/workspace';

// A single hidden helper exists only while focus detection is needed. No shell
// interpolation of window titles or user-supplied strings; nothing is logged.
const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class TomoForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
}
'@
while ($true) {
  try {
    $handle = [TomoForeground]::GetForegroundWindow()
    $text = New-Object System.Text.StringBuilder 2048
    [void][TomoForeground]::GetWindowText($handle, $text, $text.Capacity)
    [uint32]$foregroundPid = 0
    [void][TomoForeground]::GetWindowThreadProcessId($handle, [ref]$foregroundPid)
    $proc = Get-Process -Id $foregroundPid -ErrorAction Stop
    @{ processName = $proc.ProcessName; title = $text.ToString() } | ConvertTo-Json -Compress
  } catch { [Console]::WriteLine('null') }
  Start-Sleep -Milliseconds 500
}
`;

export class ForegroundMonitor {
  private child: ChildProcessWithoutNullStreams | null = null;
  private active: ForegroundWindow | null = null;
  private updated = 0;
  start() {
    if (this.child || process.platform !== 'win32') return;
    let buffer = '';
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true });
    this.child = child;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? '';
      for (const line of lines) {
        try { this.active = JSON.parse(line.replace(/^\uFEFF/, '')); this.updated = Date.now(); }
        catch { this.active = null; }
      }
    });
    child.stderr.resume();
    const clear = () => { if (this.child === child) { this.child = null; this.active = null; } };
    child.on('error', clear); child.on('exit', clear);
  }
  read(): ForegroundWindow | null { return Date.now() - this.updated < 1500 ? this.active : null; }
  stop() { this.child?.kill(); this.child = null; this.active = null; }
}
