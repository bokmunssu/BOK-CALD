import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodoItem } from '../../src/types';
import { localTaskHash, remoteTaskHash } from '../../src/utils/microsoftTodo';
vi.mock('electron', () => ({
  app: { on: vi.fn() }, BrowserWindow: { getAllWindows: () => [] }, ipcMain: { handle: vi.fn() },
  shell: { openExternal: vi.fn() }, safeStorage: {
    isEncryptionAvailable: () => true, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString()
  }
}));
vi.mock('electron-store', () => ({ default: class {
  get(key: string) { return key === 'tokens' ? Buffer.from(JSON.stringify({ access_token: 'token', refresh_token: 'refresh', expires_at: Date.now() + 3600000 })).toString('base64') : undefined; }
  set() {} delete() {}
} }));
import { MicrosoftTodoService } from '../../electron/microsoftTodo';
const task: TodoItem = { id: 'local', content: '작업', completed: false, important: false, date: new Date(2026, 9, 5), createdAt: new Date(2026, 9, 5) };
const remote = { id: 'remote', title: '작업', status: 'notStarted', importance: 'normal', dueDateTime: { dateTime: '2026-10-05T00:00:00', timeZone: 'Korea Standard Time' }, '@odata.etag': 'etag' };
function setup(todos: TodoItem[] = [], mapped = false) {
  const data: Record<string, any> = { todos, microsoftSync: { accountId: 'account', listId: 'list', autoSync: true, mappings: mapped ? [{ localId: task.id, taskId: remote.id, localHash: localTaskHash(task), remoteHash: remoteTaskHash(remote) }] : [] } };
  const store = { get: (key: string) => data[key], set: (key: string, value: unknown) => { data[key] = value; } };
  return { service: new MicrosoftTodoService(store as any, vi.fn()), data };
}
function response(value: unknown, status = 200) { return new Response(status === 204 ? null : JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => { vi.restoreAllMocks(); });
describe('Microsoft To Do service', () => {
  it('imports every page and saves mappings without duplicate imports', async () => {
    const { service, data } = setup();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ value: [remote], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next' })).mockResolvedValueOnce(response({ value: [{ ...remote, id: 'second', title: '다음 페이지' }] }));
    await service.sync(); expect(data.todos).toHaveLength(2); expect(data.microsoftSync.mappings).toHaveLength(2);
    fetch.mockResolvedValue(response({ value: [remote, { ...remote, id: 'second', title: '다음 페이지' }] }));
    await service.sync(); expect(data.todos).toHaveLength(2); expect(service.status().syncing).toBe(false);
  });
  it('uploads completion changes with concurrency protection', async () => {
    const { service, data } = setup([{ ...task, completed: true }], true);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ value: [remote] })).mockResolvedValueOnce(response({ ...remote, status: 'completed' }));
    await service.sync();
    const options = fetch.mock.calls[1][1]!;
    expect(options.method).toBe('PATCH'); expect((options.headers as any)['If-Match']).toBe('etag');
    expect(JSON.parse(options.body as string).status).toBe('completed');
    expect(data.microsoftSync.mappings[0].localHash).toBe(localTaskHash(data.todos[0]));
  });
  it('preserves a local copy when both sides edited', async () => {
    const { service, data } = setup([{ ...task, content: '로컬 수정' }], true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ value: [{ ...remote, title: '원격 수정' }] }));
    await service.sync(); expect(data.todos.map((t: TodoItem) => t.content)).toEqual(['원격 수정', '로컬 수정 (로컬 사본)']);
  });
  it('propagates a local deletion and removes its mapping', async () => {
    const { service, data } = setup([], true);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ value: [remote] })).mockResolvedValueOnce(response(null, 204));
    await service.sync(); expect(fetch.mock.calls[1][1]?.method).toBe('DELETE'); expect(data.microsoftSync.mappings).toEqual([]);
  });
  it('recovers a lost creation response through linked resources', async () => {
    const { service, data } = setup([task]);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ value: [{ ...remote, linkedResources: [{ applicationName: 'TOMO CALENDAR', externalId: 'account:local' }] }] }));
    await service.sync(); expect(fetch).toHaveBeenCalledTimes(1); expect(data.todos).toHaveLength(1); expect(data.todos[0].microsoft.taskId).toBe('remote');
  });
  it('keeps an edit made during an upload for the next sync', async () => {
    const { service, data } = setup([task]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ value: [] })).mockImplementationOnce(async () => {
      data.todos = [{ ...task, content: '입력 중 변경' }]; return response(remote);
    });
    await service.sync(); expect(data.todos[0].content).toBe('입력 중 변경');
    expect(data.microsoftSync.mappings[0].localHash).toBe(localTaskHash(task));
  });
  it('rejects paging URLs outside Microsoft Graph', async () => {
    const { service } = setup();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ value: [], '@odata.nextLink': 'https://other.example/v1.0/tasks' }));
    await expect(service.sync()).rejects.toThrow('잘못된 Microsoft 요청'); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('cannot persist changes after disconnect during a request', async () => {
    const { service, data } = setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => { service.disconnect(); return response({ value: [remote] }); });
    await expect(service.sync()).rejects.toThrow('계정 연결이 변경'); expect(data.todos).toEqual([]);
  });
});
