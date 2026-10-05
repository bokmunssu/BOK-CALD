import { describe, it, expect, vi, afterEach } from 'vitest';
import { compareVersions, getLatestVersion, checkForUpdates, LATEST_RELEASE_API, RELEASES_URL } from '../version';
afterEach(() => { vi.unstubAllGlobals(); });
describe('BOK-CALD releases', () => {
  it('compares numeric versions and prerelease versions', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('v1.4.0', '1.4.0+build')).toBe(0);
    expect(compareVersions('1.4.0-rc.2', '1.4.0')).toBe(-1);
    expect(compareVersions('1.4.0-rc.10', '1.4.0-rc.2')).toBe(1);
  });
  it('reads only the fork and validates release links', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tag_name: 'v1.5.0', html_url: `${RELEASES_URL}/tag/v1.5.0` }) });
    vi.stubGlobal('fetch', fetch);
    expect((await getLatestVersion())?.version).toBe('1.5.0');
    expect(fetch.mock.calls[0][0]).toBe(LATEST_RELEASE_API);
    fetch.mockResolvedValue({ ok: true, json: async () => ({ tag_name: 'v1.5.0', html_url: 'https://example.com' }) });
    expect(await getLatestVersion()).toBeNull();
  });
  it('does not claim up-to-date when offline or no release exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect((await checkForUpdates()).status).toBe('unavailable');
  });
});
