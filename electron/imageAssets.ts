import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export class ImageAssets {
  converted = 0;
  constructor(private directory: string) { mkdirSync(directory, { recursive: true }); }
  externalize(value: unknown, seen = new Map<string, string>()): unknown {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      if (seen.has(value)) return seen.get(value);
      const match = /^data:image\/(png|jpeg|webp|gif);base64,([a-zA-Z0-9+/=\r\n]+)$/.exec(value);
      if (!match || match[2].length > 8 * 1024 * 1024) return value;
      const bytes = Buffer.from(match[2], 'base64');
      ++this.converted;
      const name = createHash('sha256').update(bytes).digest('hex') + '.' + match[1];
      const file = path.join(this.directory, name);
      if (!existsSync(file)) writeFileSync(file, bytes, { flag: 'wx' });
      const url = 'tomo-image://local/' + name; seen.set(value, url); return url;
    }
    if (Array.isArray(value)) return value.map(item => this.externalize(item, seen));
    if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.externalize(item, seen)]));
    return value;
  }
  resolve(url: string): string | null {
    try { const parsed = new URL(url); const name = parsed.pathname.slice(1); return parsed.hostname === 'local' && /^[a-f0-9]{64}\.(png|jpeg|gif|webp)$/.test(name) ? path.join(this.directory, name) : null; } catch { return null; }
  }
}
