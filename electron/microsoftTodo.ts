import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import Store from 'electron-store';
import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { GraphTask, MicrosoftList, MicrosoftStatus, TaskMapping } from '../src/types/microsoft';
import type { TodoItem } from '../src/types';
import { importTask, localTaskBody, localTaskHash, remoteTaskHash, taskSyncAction } from '../src/utils/microsoftTodo';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const SCOPES = 'openid profile offline_access User.Read Tasks.ReadWrite';
const CLIENT_ID = process.env.TOMO_MICROSOFT_CLIENT_ID || '';
type Tokens = { access_token: string; refresh_token: string; expires_at: number };
type SyncData = { accountId?: string; email?: string; listId?: string; listName?: string; lastSync?: string; mappings: TaskMapping[]; mappingSets?: Record<string, TaskMapping[]>; autoSync: boolean };

export class MicrosoftTodoService {
  private tokens: Tokens | null = null;
  private authStore = new Store({ name: 'microsoft-auth' });
  private clientId = (this.authStore.get('clientId') as string) || CLIENT_ID;
  private server: Server | null = null;
  private cancelLogin: (() => void) | null = null;
  private flight: Promise<MicrosoftStatus> | null = null;
  private generation = 0;
  private lastError = '';
  private refreshFlight: Promise<string> | null = null;
  private data: SyncData;
  constructor(private store: Store, private notify: (key: string, value: unknown) => void) {
    this.data = (store.get('microsoftSync') as SyncData) || { mappings: [], autoSync: true };
    this.data.mappings ||= [];
    try {
      const encrypted = this.authStore.get('tokens');
      if (typeof encrypted === 'string' && safeStorage.isEncryptionAvailable()) this.tokens = JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64')));
    } catch { this.authStore.delete('tokens'); }
  }
  status(): MicrosoftStatus {
    return { configured: /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(this.clientId), connected: !!this.tokens,
      email: this.data.email, accountId: this.data.accountId, listId: this.data.listId, listName: this.data.listName,
      lastSync: this.data.lastSync, autoSync: this.data.autoSync !== false, syncing: !!this.flight, error: this.lastError || undefined };
  }
  private emit() { for (const w of BrowserWindow.getAllWindows()) w.webContents.send('microsoft-changed', this.status()); }
  private persist() { this.store.set('microsoftSync', this.data); }
  private saveTokens(tokens: Tokens) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('이 기기에서 계정 정보를 안전하게 저장할 수 없습니다.');
    this.authStore.set('tokens', safeStorage.encryptString(JSON.stringify(tokens)).toString('base64')); this.tokens = tokens;
  }
  configure(clientId: string) {
    if (typeof clientId !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(clientId.trim())) throw new Error('Microsoft 애플리케이션 ID를 확인해 주세요.');
    this.disconnect(); this.clientId = clientId.trim(); this.authStore.set('clientId', this.clientId); this.emit(); return this.status();
  }
  async login() {
    if (!this.status().configured) throw new Error('Microsoft 연결 정보가 없습니다. 개인용 앱 등록 ID를 저장하면 로그인할 수 있습니다. Microsoft Store 배포는 필요하지 않습니다.');
    if (this.server) throw new Error('Microsoft 로그인 창에서 먼저 로그인을 마쳐 주세요.');
    const verifier = randomBytes(48).toString('base64url'); const state = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const generation = ++this.generation;
    const server = createServer(); this.server = server;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('로그인 수신기를 시작하지 못했습니다.');
      const redirect = `http://localhost:${address.port}`;
      const codePromise = new Promise<string>((resolve, reject) => {
        this.cancelLogin = () => reject(new Error('로그인이 취소되었습니다.'));
        timer = setTimeout(() => reject(new Error('로그인 시간이 초과되었습니다. 다시 시도해 주세요.')), 180000);
        server.on('request', (req, res) => {
          const url = new URL(req.url || '/', redirect);
          if (url.pathname !== '/') { res.writeHead(404); res.end(); return; }
          if (url.searchParams.get('state') !== state) { res.writeHead(400); res.end('Invalid login state'); return; }
          const code = url.searchParams.get('code');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>TOMO CALENDAR</title><body style="font-family:system-ui;text-align:center;padding:60px"><h1>TOMO CALENDAR</h1><p>앱으로 돌아가 로그인 결과를 확인하세요. 이 창은 닫아도 됩니다.</p></body></html>');
          if (code) resolve(code); else reject(new Error(url.searchParams.get('error') === 'access_denied' ? '로그인이 취소되었습니다.' : 'Microsoft 인증에 실패했습니다.'));
        });
      });
      // Attach the rejection handler before opening the browser.
      const authUrl = new URL(`${AUTH}/authorize`);
      authUrl.search = new URLSearchParams({ client_id: this.clientId, response_type: 'code', redirect_uri: redirect, scope: SCOPES,
        state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      void shell.openExternal(authUrl.toString()).catch(() => this.cancelLogin?.());
      const code = await codePromise;
      const token = await this.tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier });
      if (generation !== this.generation) throw new Error('로그인이 취소되었습니다.');
      this.saveTokens(token);
      const profile = await this.api<{ id: string; mail?: string; userPrincipalName: string }>('/me');
      if (generation !== this.generation) throw new Error('로그인이 취소되었습니다.');
      if (this.data.accountId !== profile.id) this.data = { mappings: [], autoSync: true };
      this.data.accountId = profile.id; this.data.email = profile.mail || profile.userPrincipalName;
      this.lastError = ''; this.persist(); this.emit(); return this.status();
    } catch (error) {
      if (generation === this.generation) { this.tokens = null; this.authStore.delete('tokens'); this.emit(); }
      throw error;
    } finally {
      clearTimeout(timer); server.close(); if (this.server === server) { this.server = null; this.cancelLogin = null; }
    }
  }
  cancel() { if (this.server) { ++this.generation; this.cancelLogin?.(); this.server.close(); } }
  disconnect() {
    this.cancel(); ++this.generation; this.tokens = null; this.authStore.delete('tokens'); this.lastError = '';
    this.emit(); return this.status();
  }
  private async tokenRequest(params: Record<string, string>): Promise<Tokens> {
    const response = await fetch(`${AUTH}/token`, { method: 'POST', body: new URLSearchParams({ client_id: this.clientId, scope: SCOPES, ...params }), signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok) throw new Error('Microsoft 인증이 만료됐거나 앱 등록 설정이 올바르지 않습니다. 다시 로그인해 주세요.');
    return { access_token: data.access_token, refresh_token: data.refresh_token || this.tokens?.refresh_token, expires_at: Date.now() + data.expires_in * 1000 };
  }
  private async accessToken(force = false) {
    if (!this.tokens) throw new Error('Microsoft 계정에 로그인해 주세요.');
    if (!force && this.tokens.expires_at > Date.now() + 60000) return this.tokens.access_token;
    if (!this.refreshFlight) {
      const generation = this.generation; const refresh = this.tokens.refresh_token;
      this.refreshFlight = this.tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh }).then(tokens => {
        if (generation !== this.generation) throw new Error('계정 연결이 해제되었습니다.');
        this.saveTokens(tokens); return tokens.access_token;
      }).finally(() => { this.refreshFlight = null; });
    }
    return this.refreshFlight;
  }
  private async api<T = any>(route: string, method = 'GET', body?: unknown, etag?: string): Promise<T> {
    const url = new URL(route.startsWith('https:') ? route : `${GRAPH}${route}`);
    if (url.origin !== 'https://graph.microsoft.com' || !url.pathname.startsWith('/v1.0/')) throw new Error('잘못된 Microsoft 요청입니다.');
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = await this.accessToken(attempt === 1);
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
      if (response.status === 401 && attempt === 0) continue;
      if (response.status === 429 && attempt < 2) {
        const seconds = Number(response.headers.get('Retry-After') || 2);
        if (seconds > 15) throw new Error('Microsoft 요청이 많아 잠시 후 동기화할 수 있습니다.');
        await new Promise(resolve => setTimeout(resolve, Math.max(1, seconds) * 1000)); continue;
      }
      if (!response.ok) {
        if (response.status === 412) throw new Error('Microsoft에서 같은 할 일이 수정됐습니다. 다시 동기화하면 두 변경을 보존합니다.');
        if (response.status === 404) throw Object.assign(new Error('Microsoft에서 해당 항목을 찾을 수 없습니다.'), { status: 404 });
        throw new Error(response.status === 403 ? 'Microsoft To Do 권한 또는 계정의 이용 가능 여부를 확인해 주세요.' : `Microsoft 동기화 실패 (${response.status})`);
      }
      return response.status === 204 ? undefined as T : response.json();
    }
    throw new Error('Microsoft 연결을 다시 확인해 주세요.');
  }
  private async collection<T>(route: string): Promise<T[]> {
    const all: T[] = []; let next: string | undefined = route;
    while (next) { const page: { value: T[]; '@odata.nextLink'?: string } = await this.api(next); all.push(...page.value); next = page['@odata.nextLink']; }
    return all;
  }
  lists() { return this.collection<MicrosoftList>('/me/todo/lists'); }
  async selectList(id: string, autoSync = true) {
    if (this.flight) throw new Error('동기화를 마친 뒤 목록을 바꿔 주세요.');
    const lists = await this.lists(); const list = lists.find(l => l.id === id);
    if (!list) throw new Error('목록을 다시 선택해 주세요.');
    if (this.data.listId !== id) {
      this.data.mappingSets ||= {};
      if (this.data.listId) this.data.mappingSets[this.data.listId] = this.data.mappings;
      this.data.mappings = this.data.mappingSets[id] || [];
    }
    this.data.listId = id; this.data.listName = list.displayName; this.data.autoSync = autoSync;
    this.persist(); this.emit(); return this.status();
  }
  async createList() {
    const list = await this.api<MicrosoftList>('/me/todo/lists', 'POST', { displayName: 'TOMO CALENDAR' });
    await this.selectList(list.id); return list;
  }
  autoSync(value: boolean) { this.data.autoSync = value === true; this.persist(); this.emit(); return this.status(); }
  sync(): Promise<MicrosoftStatus> {
    if (this.flight) return this.flight;
    if (!this.tokens || !this.data.listId || !this.data.accountId) return Promise.reject(new Error('로그인 후 동기화할 목록을 선택해 주세요.'));
    this.lastError = '';
    this.flight = this.runSync().catch(error => { this.lastError = error.message || '동기화에 실패했습니다.'; throw error; }).finally(() => { this.flight = null; this.emit(); });
    this.emit(); return this.flight.then(() => this.status());
  }
  private async runSync(): Promise<MicrosoftStatus> {
    const generation = this.generation; const accountId = this.data.accountId!; const listId = this.data.listId!;
    const route = `/me/todo/lists/${encodeURIComponent(listId)}/tasks`;
    const remote = await this.collection<GraphTask>(`${route}?$expand=linkedResources`);
    const remotes = new Map(remote.map(task => [task.id, task]));
    const local = (this.store.get('todos') as TodoItem[] || []).map(t => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }));
    const locals = new Map(local.map(t => [t.id, t]));
    const mappings = [...this.data.mappings];
    const ensureCurrent = () => { if (generation !== this.generation || !this.tokens) throw new Error('계정 연결이 변경되었습니다.'); };
    const applyLocal = (id: string, previous: TodoItem | undefined, next?: TodoItem) => {
      ensureCurrent(); const latest = this.store.get('todos') as TodoItem[] || [];
      const current = latest.find(t => t.id === id);
      // Do not overwrite typing performed while a network call was in flight.
      if (previous && (!current || localTaskHash(current) !== localTaskHash(previous))) return false;
      const result = next ? current ? latest.map(t => t.id === id ? next : t) : [...latest, next] : latest.filter(t => t.id !== id);
      this.store.set('todos', result); this.notify('todos', result); return true;
    };
    const saveMapping = (localTask: TodoItem, remoteTask: GraphTask) => {
      ensureCurrent(); const mapping = { localId: localTask.id, taskId: remoteTask.id, localHash: localTaskHash(localTask), remoteHash: remoteTaskHash(remoteTask) };
      this.data.mappings = [...this.data.mappings.filter(m => m.localId !== localTask.id), mapping]; this.persist();
    };
    const forget = (id: string) => { this.data.mappings = this.data.mappings.filter(m => m.localId !== id); this.persist(); };
    const createRemote = async (task: TodoItem) => {
      ensureCurrent();
      // Linked resources recover a completed POST after a lost response or restart.
      const existing = remote.find(r => r.linkedResources?.some(link => link.applicationName === 'TOMO CALENDAR' && link.externalId === `${accountId}:${task.id}`));
      const created = existing || await this.api<GraphTask>(route, 'POST', { ...localTaskBody(task), linkedResources: [{ applicationName: 'TOMO CALENDAR', displayName: task.content, externalId: `${accountId}:${task.id}`, webUrl: 'https://github.com/bokmunssu/BOK-CALD' }] });
      const linked = { ...task, microsoft: { accountId, listId, taskId: created.id } };
      applyLocal(task.id, task, linked); saveMapping(linked, created);
    };
    for (const map of mappings) {
      ensureCurrent(); const l = locals.get(map.localId); const r = remotes.get(map.taskId);
      const action = taskSyncAction(map, l, r);
      if (action === 'deleteRemote') {
        try { await this.api(`${route}/${encodeURIComponent(map.taskId)}`, 'DELETE', undefined, r?.['@odata.etag']); }
        catch (e) { if ((e as {status?: number}).status !== 404) throw e; }
        forget(map.localId);
      } else if (action === 'forget') forget(map.localId);
      else if (action === 'deleteLocal') { if (applyLocal(map.localId, l)) forget(map.localId); }
      else if (action === 'recreate') await createRemote(l!);
      else if (action === 'push') {
        const updated = await this.api<GraphTask>(`${route}/${encodeURIComponent(map.taskId)}`, 'PATCH', localTaskBody(l!), r?.['@odata.etag']);
        saveMapping(l!, updated);
      } else if (action === 'pull' || action === 'conflict') {
        if (action === 'conflict') {
          const copy = { ...l!, id: randomUUID(), content: `${l!.content} (로컬 사본)`, microsoft: undefined, updatedAt: new Date() };
          applyLocal(copy.id, undefined, copy);
        }
        const imported = importTask(r!, l!.id, accountId, listId, l);
        if (applyLocal(l!.id, l, imported)) saveMapping(imported, r!);
      }
    }
    for (const task of local) {
      ensureCurrent();
      if (!mappings.some(m => m.localId === task.id) && !task.microsoft) await createRemote(task);
      else if (!mappings.some(m => m.localId === task.id) && task.microsoft?.accountId === accountId && task.microsoft.listId === listId) {
        const r = remotes.get(task.microsoft.taskId);
        if (r) { const imported = importTask(r, task.id, accountId, listId, task); if (applyLocal(task.id, task, imported)) saveMapping(imported, r); }
      }
    }
    for (const task of remote) {
      ensureCurrent();
      if (this.data.mappings.some(m => m.taskId === task.id) || mappings.some(m => m.taskId === task.id)) continue;
      const linked = task.linkedResources?.find(link => link.applicationName === 'TOMO CALENDAR' && link.externalId.startsWith(`${accountId}:`));
      const id = linked?.externalId.slice(accountId.length + 1) || randomUUID();
      if (locals.has(id)) continue;
      const imported = importTask(task, id, accountId, listId);
      if (applyLocal(id, undefined, imported)) saveMapping(imported, task);
    }
    ensureCurrent(); this.data.lastSync = new Date().toISOString(); this.persist(); return this.status();
  }
}

export function registerMicrosoftTodo(store: Store, notify: (key: string, value: unknown) => void) {
  const service = new MicrosoftTodoService(store, notify);
  ipcMain.handle('microsoft-status', () => service.status());
  ipcMain.handle('microsoft-login', () => service.login());
  ipcMain.handle('microsoft-configure', (_, id: string) => service.configure(id));
  ipcMain.handle('microsoft-cancel', () => service.cancel());
  ipcMain.handle('microsoft-disconnect', () => service.disconnect());
  ipcMain.handle('microsoft-lists', () => service.lists());
  ipcMain.handle('microsoft-select', (_, id: string) => service.selectList(id));
  ipcMain.handle('microsoft-create-list', () => service.createList());
  ipcMain.handle('microsoft-auto', (_, value: boolean) => service.autoSync(value));
  ipcMain.handle('microsoft-sync', () => service.sync());
  const interval = setInterval(() => {
    const status = service.status();
    if (status.connected && status.listId && status.autoSync) void service.sync().catch(() => {});
  }, 60000);
  app.on('before-quit', () => { clearInterval(interval); service.cancel(); });
  return service;
}
