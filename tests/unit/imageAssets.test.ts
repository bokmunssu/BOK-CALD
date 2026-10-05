import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ImageAssets } from '../../electron/imageAssets';
const directory = mkdtempSync(path.join(tmpdir(), 'tomo-assets-'));
afterEach(() => { for (const file of readdirSync(directory)) rmSync(path.join(directory,file)); });
it('preserves exact image bytes, deduplicates and keeps text changes compact', () => {
  const assets = new ImageAssets(directory); const bytes = Buffer.alloc(1024 * 1024, 123);
  const image = 'data:image/png;base64,' + bytes.toString('base64');
  const records = assets.externalize([{ id:'a', image }, { id:'b', image }]) as {image:string}[];
  expect(JSON.stringify(records).length).toBeLessThan(250);
  expect(records[0].image).toBe(records[1].image); expect(readdirSync(directory)).toHaveLength(1);
  expect(readFileSync(assets.resolve(records[0].image)!)).toEqual(bytes);
});
it('rejects path traversal and external hosts', () => {
  const assets = new ImageAssets(directory);
  expect(assets.resolve('tomo-image://local/../../config.json')).toBeNull();
  expect(assets.resolve('tomo-image://evil/' + 'a'.repeat(64) + '.png')).toBeNull();
  expect(assets.resolve('tomo-image://local/not-a-hash.png')).toBeNull();
});
