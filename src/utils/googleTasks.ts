import type { TodoItem } from "../types";
import type { GoogleTask, TaskMapping } from "../types/googleTasks";
import { localDay } from "./worktime";
export function localTaskBody(task: TodoItem) {
  const due =
    task.dueDate === undefined ? localDay(new Date(task.date)) : task.dueDate;
  return {
    title: task.content.trim(),
    status: task.completed ? "completed" : "needsAction",
    due: due ? `${due}T00:00:00.000Z` : null,
  };
}
export const localTaskHash = (task: TodoItem) =>
  JSON.stringify(localTaskBody(task));
export const remoteTaskHash = (task: GoogleTask) =>
  JSON.stringify({
    title: task.title,
    completed: task.status === "completed",
    due: task.due?.slice(0, 10) || "",
  });
export function importTask(
  remote: GoogleTask,
  id: string,
  accountId: string,
  listId: string,
  previous?: TodoItem,
): TodoItem {
  const due = remote.due?.slice(0, 10) || "";
  return {
    ...previous,
    id,
    content: remote.title || "",
    completed: remote.status === "completed",
    important: previous?.important ?? false,
    date: due ? new Date(`${due}T00:00:00`) : (previous?.date ?? new Date()),
    dueDate: due,
    createdAt: previous?.createdAt ?? new Date(),
    updatedAt: new Date(remote.updated || Date.now()),
    googleTasks: { accountId, listId, taskId: remote.id },
  };
}
export function taskSyncAction(
  mapping: TaskMapping,
  local?: TodoItem,
  remote?: GoogleTask,
) {
  if (!local) return remote ? "deleteRemote" : "forget";
  if (!remote || remote.deleted)
    return localTaskHash(local) === mapping.localHash
      ? "deleteLocal"
      : "recreate";
  const l = localTaskHash(local) !== mapping.localHash,
    r = remoteTaskHash(remote) !== mapping.remoteHash;
  return l && r ? "conflict" : l ? "push" : r ? "pull" : "unchanged";
}
