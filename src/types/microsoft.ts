export interface MicrosoftList { id: string; displayName: string }
export interface MicrosoftStatus {
  configured: boolean; connected: boolean; email?: string; accountId?: string;
  listId?: string; listName?: string; lastSync?: string; syncing: boolean; error?: string;
  autoSync: boolean;
}
export interface GraphTask {
  id: string; title: string; status: string; importance: string;
  dueDateTime?: { dateTime: string; timeZone: string } | null;
  lastModifiedDateTime?: string; '@odata.etag'?: string;
  linkedResources?: { applicationName: string; externalId: string }[];
}
export interface TaskMapping { localId: string; taskId: string; localHash: string; remoteHash: string }
