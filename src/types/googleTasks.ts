export interface GoogleTaskList {
  id: string;
  title: string;
}
export interface GoogleTasksStatus {
  configured: boolean;
  connected: boolean;
  email?: string;
  accountId?: string;
  listId?: string;
  listName?: string;
  lastSync?: string;
  syncing: boolean;
  autoSync: boolean;
  error?: string;
  needsReview?: boolean;
}
export interface GoogleTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;
  notes?: string;
  deleted?: boolean;
  updated?: string;
  etag?: string;
}
export interface TaskMapping {
  localId: string;
  taskId: string;
  localHash: string;
  remoteHash: string;
}
