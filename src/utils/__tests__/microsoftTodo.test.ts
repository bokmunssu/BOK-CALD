import { describe, it, expect } from 'vitest';
import { importTask, localTaskBody, localTaskHash, remoteTaskHash, taskSyncAction } from '../microsoftTodo';
const local = { id: 'local', date: new Date(2026, 9, 5), createdAt: new Date(), content: '작업', completed: false, important: true };
const remote = { id: 'remote', title: '작업', status: 'notStarted', importance: 'high', dueDateTime: { dateTime: '2026-10-05T00:00:00', timeZone: 'Korea Standard Time' } };
const map = { localId: local.id, taskId: remote.id, localHash: localTaskHash(local), remoteHash: remoteTaskHash(remote) };
describe('Microsoft To Do synchronization decisions', () => {
  it('maps Korean dates, completion, importance, and undated tasks', () => {
    expect(localTaskBody(local).dueDateTime?.dateTime).toBe('2026-10-05T00:00:00');
    expect(localTaskBody({ ...local, dueDate: '' }).dueDateTime).toBeNull();
    expect(importTask({ ...remote, status: 'completed' }, 'x', 'account', 'list').completed).toBe(true);
    expect(importTask(remote, 'x', 'account', 'list').microsoft?.taskId).toBe('remote');
  });
  it('distinguishes independent edits and preserves conflicts for the service', () => {
    expect(taskSyncAction(map, local, remote)).toBe('unchanged');
    expect(taskSyncAction(map, { ...local, completed: true }, remote)).toBe('push');
    expect(taskSyncAction(map, local, { ...remote, title: '수정' })).toBe('pull');
    expect(taskSyncAction(map, { ...local, content: '로컬' }, { ...remote, title: '원격' })).toBe('conflict');
  });
  it('does not resurrect deleted tasks unless unsynced local edits need preservation', () => {
    expect(taskSyncAction(map, undefined, remote)).toBe('deleteRemote');
    expect(taskSyncAction(map, local, undefined)).toBe('deleteLocal');
    expect(taskSyncAction(map, { ...local, content: '새 수정' }, undefined)).toBe('recreate');
    expect(taskSyncAction(map, undefined, undefined)).toBe('forget');
  });
});
