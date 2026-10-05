import type { TodoItem } from '../types';
import type { GraphTask, TaskMapping } from '../types/microsoft';
import { localDay } from './worktime';

export function localTaskBody(task: TodoItem) {
  const due = task.dueDate === undefined ? localDay(new Date(task.date)) : task.dueDate;
  return {
    title: task.content.trim(), status: task.completed ? 'completed' : 'notStarted',
    importance: task.important ? 'high' : 'normal',
    dueDateTime: due ? { dateTime: `${due}T00:00:00`, timeZone: 'Korea Standard Time' } : null,
  };
}
export const localTaskHash = (task: TodoItem) => JSON.stringify(localTaskBody(task));
export const remoteTaskHash = (task: GraphTask) => JSON.stringify({ title: task.title, completed: task.status === 'completed', important: task.importance === 'high', due: task.dueDateTime?.dateTime.slice(0, 10) || '' });
export function importTask(remote: GraphTask, id: string, accountId: string, listId: string, previous?: TodoItem): TodoItem {
  const due = remote.dueDateTime?.dateTime.slice(0, 10) || '';
  return { ...previous, id, content: remote.title, completed: remote.status === 'completed', important: remote.importance === 'high',
    date: due ? new Date(`${due}T00:00:00`) : previous?.date ?? new Date(), dueDate: due,
    createdAt: previous?.createdAt ?? new Date(), updatedAt: new Date(remote.lastModifiedDateTime || Date.now()),
    microsoft: { accountId, listId, taskId: remote.id } };
}
export function taskSyncAction(mapping: TaskMapping, local?: TodoItem, remote?: GraphTask) {
  if (!local) return remote ? 'deleteRemote' : 'forget';
  if (!remote) return localTaskHash(local) === mapping.localHash ? 'deleteLocal' : 'recreate';
  const l = localTaskHash(local) !== mapping.localHash; const r = remoteTaskHash(remote) !== mapping.remoteHash;
  return l && r ? 'conflict' : l ? 'push' : r ? 'pull' : 'unchanged';
}
