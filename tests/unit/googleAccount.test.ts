import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'node:http';
import { createHash } from 'node:crypto';
const cache = vi.hoisted(() => new Map<string, unknown>());
vi.mock('electron-store', () => ({ default: class { get(k: string) { return cache.get(k); } set(k: string,v: unknown) { cache.set(k,v); } delete(k: string) { cache.delete(k); } } }));
vi.mock('electron', () => ({ app: { on: vi.fn() }, ipcMain: { handle: vi.fn() }, shell: { openExternal: vi.fn() }, safeStorage: {
  isEncryptionAvailable: () => true, encryptString: (s: string) => Buffer.from('encrypted:'+s), decryptString: (b: Buffer) => b.toString().slice(10)
} }));
import { shell } from 'electron';
import { GoogleAccount } from '../../electron/googleAccount';
function callback(url: string) { return new Promise<number>(resolve => { get(url, res => { res.resume(); res.on('end', () => resolve(res.statusCode!)); }); }); }
function setup() { const a = new GoogleAccount(); a.configure({clientId:'test.apps.googleusercontent.com',clientSecret:'desktop-test'}); return a; }
beforeEach(() => { cache.clear(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
describe('Google desktop OAuth', () => {
  it('requests Tasks permissions without Calendar permissions for the Tasks login', async () => {
    const a = setup(); vi.mocked(shell.openExternal).mockImplementation(async address => { const scopes=new URL(address).searchParams.get('scope')!.split(' ');expect(scopes).toContain('https://www.googleapis.com/auth/tasks');expect(scopes.some(s=>s.includes('/calendar'))).toBe(false);a.cancel(); });
    await expect(a.login(true)).rejects.toThrow('취소');
  });
  it('reports missing configuration before opening a browser or local listener', async () => {
    const a = new GoogleAccount(); await expect(a.login()).rejects.toThrow('Google 연결 설정이 누락');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
  it('uses the system browser, state and matching PKCE verifier with a random loopback port', async () => {
    const a = setup(); let challenge = '';
    vi.mocked(shell.openExternal).mockImplementation(async address => {
      const url = new URL(address); expect(url.hostname).toBe('accounts.google.com');
      const scopes = url.searchParams.get('scope')!.split(' ');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.app.created');
      expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256'); challenge = url.searchParams.get('code_challenge')!;
      const redirect = new URL(url.searchParams.get('redirect_uri')!); expect(redirect.hostname).toBe('127.0.0.1'); expect(Number(redirect.port)).toBeGreaterThan(0);
      redirect.search = new URLSearchParams({state:url.searchParams.get('state')!,code:'test-code'}).toString();
      await callback(redirect.toString());
    });
    const fetch = vi.fn().mockImplementation(async (_url, options) => {
      const params = options.body as URLSearchParams;
      expect(createHash('sha256').update(params.get('code_verifier')!).digest('base64url')).toBe(challenge);
      return new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',expires_in:3600,scope:'calendar',token_type:'Bearer'}));
    });
    vi.stubGlobal('fetch', fetch);
    const auth = await a.login(); expect(auth.access_token).toBe('access');
    expect(cache.get('tokens')).not.toContain('access'); expect(a.auth()?.refresh_token).toBe('refresh');
  });
  it('rejects a mismatched state and accepts only the matching callback', async () => {
    const a = setup();
    vi.mocked(shell.openExternal).mockImplementation(async address => {
      const url = new URL(address); const redirect = new URL(url.searchParams.get('redirect_uri')!);
      redirect.search = 'state=wrong&code=wrong'; expect(await callback(redirect.toString())).toBe(400);
      redirect.search = new URLSearchParams({state:url.searchParams.get('state')!,code:'right'}).toString(); await callback(redirect.toString());
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',expires_in:3600}))));
    await a.login();
  });
  it('settles the pending promise and closes the listener on cancellation', async () => {
    const a = setup(); vi.mocked(shell.openExternal).mockImplementation(async () => { a.cancel(); });
    await expect(a.login()).rejects.toThrow('취소'); expect(a.auth()).toBeNull();
  });
  it('shows a useful invalid-client error without saving tokens', async () => {
    const a = setup(); vi.mocked(shell.openExternal).mockImplementation(async address => {
      const url = new URL(address); const redirect = new URL(url.searchParams.get('redirect_uri')!); redirect.search = new URLSearchParams({state:url.searchParams.get('state')!,code:'code'}).toString(); await callback(redirect.toString());
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'invalid_client'}),{status:400})));
    await expect(a.login()).rejects.toThrow('OAuth ID/비밀번호'); expect(a.auth()).toBeNull();
  });
  it('clears tokens when personal configuration is replaced', () => {
    const a = setup(); cache.set('tokens', Buffer.from('encrypted:'+JSON.stringify({access_token:'old'})).toString('base64'));
    expect(a.auth()?.access_token).toBe('old'); a.configure({clientId:'new.apps.googleusercontent.com',clientSecret:'new-test'}); expect(a.auth()).toBeNull();
  });
});
