import packageInfo from '../../package.json';
export const RELEASES_URL = 'https://github.com/bokmunssu/BOK-CALD/releases';
export const LATEST_RELEASE_API = 'https://api.github.com/repos/bokmunssu/BOK-CALD/releases/latest';
export const getCurrentVersion = async (): Promise<string> => {
  try { return await window.electronAPI?.getAppVersion?.() || packageInfo.version; }
  catch { return packageInfo.version; }
};
const parseVersion = (value: string) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+[\w.-]+)?$/.exec(value);
  if (!match) throw new Error('Invalid release version');
  return { numbers: match.slice(1, 4).map(Number), prerelease: match[4]?.split('.') };
};
export const compareVersions = (a: string, b: string): number => {
  const first = parseVersion(a); const second = parseVersion(b);
  for (let i = 0; i < 3; i++) if (first.numbers[i] !== second.numbers[i]) return Math.sign(first.numbers[i] - second.numbers[i]);
  if (!first.prerelease || !second.prerelease) return first.prerelease ? -1 : second.prerelease ? 1 : 0;
  for (let i = 0; i < Math.max(first.prerelease.length, second.prerelease.length); i++) {
    const x = first.prerelease[i]; const y = second.prerelease[i];
    if (x === y) continue;
    if (x === undefined) return -1; if (y === undefined) return 1;
    const xn = /^\d+$/.test(x); const yn = /^\d+$/.test(y);
    if (xn && yn) return Math.sign(Number(x) - Number(y));
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
};
export const getLatestVersion = async (): Promise<{ version: string; url: string; publishedAt: string } | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(LATEST_RELEASE_API, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.draft || data.prerelease || typeof data.tag_name !== 'string' ||
      typeof data.html_url !== 'string' || !data.html_url.startsWith(`${RELEASES_URL}/tag/`)) return null;
    parseVersion(data.tag_name);
    return { version: data.tag_name.replace(/^v/, ''), url: data.html_url, publishedAt: data.published_at };
  } catch { return null; } finally { clearTimeout(timeout); }
};
export const checkForUpdates = async () => {
  const currentVersion = await getCurrentVersion();
  const latest = await getLatestVersion();
  if (!latest) return { hasUpdate: false, currentVersion, status: 'unavailable' as const };
  return { hasUpdate: compareVersions(latest.version, currentVersion) > 0, currentVersion,
    latestVersion: latest.version, url: latest.url, status: 'checked' as const };
};
