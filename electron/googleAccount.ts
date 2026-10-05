import { ipcMain, safeStorage, shell, app } from 'electron';
import Store from 'electron-store';
import { createServer, type Server } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import type { GoogleCalendarAuth } from '../src/types';
type Config = { clientId: string; clientSecret: string };
export class GoogleAccount {
  private store = new Store({ name: 'google-account' });
  private server: Server | null = null;
  private cancelPending: (() => void) | null = null;
  private generation = 0;
  private refreshFlight: Promise<GoogleCalendarAuth> | null = null;
  private read<T>(key: string): T | null {
    const value = this.store.get(key);
    if (typeof value !== 'string' || !safeStorage.isEncryptionAvailable()) return null;
    try { return JSON.parse(safeStorage.decryptString(Buffer.from(value, 'base64'))); } catch { return null; }
  }
  private save(key: string, value: unknown) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('이 컴퓨터에서 계정 정보를 안전하게 저장할 수 없습니다.');
    this.store.set(key, safeStorage.encryptString(JSON.stringify(value)).toString('base64'));
  }
  private config(): Config { return this.read<Config>('config') || { clientId: process.env.TOMO_GOOGLE_CLIENT_ID || '', clientSecret: process.env.TOMO_GOOGLE_CLIENT_SECRET || '' }; }
  info() { const c = this.config(); return { configured: !!c.clientId && !!c.clientSecret, clientId: c.clientId, personal: !!this.store.get('config') }; }
  configure(config: Config) {
    if (this.server) throw new Error('로그인을 취소한 뒤 설정을 바꿔 주세요.');
    if (!config || typeof config.clientId !== 'string' || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(config.clientId.trim())) throw new Error('Google 데스크톱 OAuth 클라이언트 ID를 확인해 주세요.');
    const secret = typeof config.clientSecret === 'string' ? config.clientSecret.trim() : '';
    if (!secret || secret.length > 500) throw new Error('데스크톱 OAuth 클라이언트 비밀번호를 입력해 주세요.');
    this.save('config', { clientId: config.clientId.trim(), clientSecret: secret });
    ++this.generation; this.store.delete('tokens'); return this.info();
  }
  auth() { return this.read<GoogleCalendarAuth>('tokens'); }
  async refresh() {
    if (!this.refreshFlight) {
      const token = this.auth(); if (!token?.refresh_token) throw new Error('구글 계정에 다시 로그인해 주세요.');
      const generation = this.generation;
      this.refreshFlight = this.exchange({ grant_type: 'refresh_token', refresh_token: token.refresh_token }).then(next => {
        if (generation !== this.generation) throw new Error('계정 연결이 변경되었습니다.');
        this.save('tokens', next); return next;
      }).finally(() => { this.refreshFlight = null; });
    }
    return this.refreshFlight;
  }
  private async exchange(params: Record<string, string>): Promise<GoogleCalendarAuth> {
    const config = this.config();
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }), signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok) {
      const messages: Record<string, string> = {
        invalid_client: 'Google OAuth ID/비밀번호 또는 데스크톱 앱 유형을 확인해 주세요.',
        invalid_grant: 'Google 인증이 만료되었거나 취소되었습니다. 다시 로그인해 주세요.',
        redirect_uri_mismatch: 'Google OAuth 클라이언트 유형을 데스크톱 앱으로 설정해 주세요.'
      };
      throw new Error(messages[data.error] || 'Google 토큰 발급 실패 (' + response.status + ')');
    }
    return { access_token: data.access_token, refresh_token: data.refresh_token || this.auth()?.refresh_token,
      scope: data.scope, token_type: data.token_type, expiry_date: Date.now() + data.expires_in * 1000 };
  }
  cancel() { if (this.server) { ++this.generation; this.cancelPending?.(); this.server.close(); } }
  disconnect() { this.cancel(); ++this.generation; this.store.delete('tokens'); }
  async login() {
    if (!this.info().configured) throw new Error('이 빌드의 Google 연결 설정이 누락되었습니다. 배포자에게 문의해 주세요.');
    if (this.server) throw new Error('진행 중인 로그인을 먼저 마쳐 주세요.');
    const config = this.config(); const generation = ++this.generation;
    const state = randomBytes(32).toString('base64url'); const verifier = randomBytes(48).toString('base64url');
    const server = createServer(); this.server = server; let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('로그인 수신기를 시작하지 못했습니다.');
      const redirect = 'http://127.0.0.1:' + address.port;
      const codePromise = new Promise<string>((resolve, reject) => {
        this.cancelPending = () => reject(new Error('구글 로그인이 취소되었습니다.'));
        timer = setTimeout(() => reject(new Error('로그인 시간이 초과되었습니다. 다시 시도해 주세요.')), 180000);
        server.on('request', (req, res) => {
          const url = new URL(req.url || '/', redirect);
          if (url.pathname !== '/') { res.writeHead(404); res.end(); return; }
          if (url.searchParams.get('state') !== state) { res.writeHead(400); res.end('Invalid state'); return; }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>TOMO CALENDAR</title><body style="font-family:system-ui;text-align:center;padding:60px"><h1>TOMO CALENDAR</h1><p>앱으로 돌아가 로그인 결과를 확인하세요. 이 창은 닫아도 됩니다.</p></body></html>');
          const code = url.searchParams.get('code');
          if (code) resolve(code); else reject(new Error(url.searchParams.get('error') === 'access_denied' ? '구글 로그인이 취소되었습니다.' : 'Google 인증을 완료하지 못했습니다.'));
        });
      });
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: redirect, response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/userinfo.email openid',
        access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
      void shell.openExternal(url.toString()).catch(() => this.cancelPending?.());
      const code = await codePromise;
      const auth = await this.exchange({ grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier });
      if (generation !== this.generation) throw new Error('로그인이 취소되었습니다.');
      this.save('tokens', auth); return auth;
    } finally { clearTimeout(timer); server.close(); if (this.server === server) { this.server = null; this.cancelPending = null; } }
  }
}
export function registerGoogleAccount() {
  const service = new GoogleAccount();
  ipcMain.handle('google-account-info', () => service.info());
  ipcMain.handle('google-account-configure', (_, value: Config) => service.configure(value));
  ipcMain.handle('google-account-login', () => service.login());
  ipcMain.handle('google-account-cancel', () => service.cancel());
  ipcMain.handle('google-account-auth', () => service.auth());
  ipcMain.handle('google-account-refresh', () => service.refresh());
  ipcMain.handle('google-account-disconnect', () => service.disconnect());
  app.on('before-quit', () => service.cancel());
}
