import { app, BrowserWindow, ipcMain } from "electron";
import Store from "electron-store";
import { randomUUID } from "node:crypto";
import { GoogleAccount } from "./googleAccount";
import type {
  GoogleTask,
  GoogleTaskList,
  GoogleTasksStatus,
  TaskMapping,
} from "../src/types/googleTasks";
import type { TodoItem } from "../src/types";
import {
  importTask,
  localTaskBody,
  localTaskHash,
  remoteTaskHash,
  taskSyncAction,
} from "../src/utils/googleTasks";
type SyncData = {
  accountId?: string;
  email?: string;
  listId?: string;
  listName?: string;
  allLists?: boolean;
  lists?: GoogleTaskList[];
  pendingMove?: { localId: string; source: string; destination: string; taskId: string };
  lastSync?: string;
  mappings: TaskMapping[];
  mappingSets?: Record<string, TaskMapping[]>;
  autoSync: boolean;
  pendingCreate?: string;
};
export class GoogleTasksService {
  private account = new GoogleAccount("google-tasks-account");
  private flight: Promise<GoogleTasksStatus> | null = null;
  private generation = 0;
  private lastError = "";
  private data: SyncData;
  constructor(
    private store: Store,
    private notify: (key: string, value: unknown) => void,
  ) {
    this.data = (store.get("googleTasksSync") as SyncData) || {
      mappings: [],
      autoSync: true,
    };
    this.data.mappings ||= [];
    // Migrate per-list mappings without losing inactive-list deletion history.
    const merged = new Map<string, TaskMapping>();
    for (const [listId, maps] of Object.entries(this.data.mappingSets || {}))
      for (const map of maps) merged.set(map.localId, { ...map, listId });
    for (const map of this.data.mappings) merged.set(map.localId, { ...map, listId: map.listId || this.data.listId });
    this.data.mappings = [...merged.values()];
    this.data.mappingSets = undefined;
    this.persist();
  }
  status(): GoogleTasksStatus {
    return {
      configured: this.account.info().configured,
      connected: !!this.account.auth() && !!this.data.accountId,
      accountId: this.data.accountId,
      email: this.data.email,
      listId: this.data.allLists ? "__all__" : this.data.listId,
      defaultListId: this.data.listId,
      allLists: !!this.data.allLists,
      lists: this.data.lists || [],
      listName: this.data.listName,
      lastSync: this.data.lastSync,
      autoSync: this.data.autoSync !== false,
      syncing: !!this.flight,
      error: this.lastError || (this.data.pendingMove ? "이전 목록 이동 결과를 확인하지 못했습니다. Google Tasks에서 원본/대상 목록을 확인해 주세요." : undefined) || (this.data.pendingCreate ? "이전 할 일 추가 결과를 확인하지 못했습니다. Google Tasks 목록을 확인해 주세요." : undefined),
      needsReview: !!this.data.pendingCreate || !!this.data.pendingMove,
    };
  }
  private emit() {
    for (const w of BrowserWindow.getAllWindows())
      w.webContents.send("googleTasks-changed", this.status());
  }
  private persist() {
    this.store.set("googleTasksSync", this.data);
  }
  async login() {
    const generation = ++this.generation;
    await this.account.login(true);
    const auth = this.account.auth()!;
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${auth.access_token}` },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) throw Error("Google 계정 정보를 확인하지 못했습니다.");
    const profile = await response.json();
    if (generation !== this.generation || !this.account.auth()) throw Error("계정 연결이 변경되었습니다.");
    if (typeof profile.id !== "string" || !profile.id) throw Error("Google 계정 ID를 확인하지 못했습니다. 다시 로그인해 주세요.");
    if (this.data.accountId !== profile.id)
      this.data = { mappings: [], autoSync: true };
    this.data.accountId = profile.id;
    this.data.email = profile.email;
    this.persist();
    this.emit();
    return this.status();
  }
  cancel() {
    this.account.cancel();
  }
  disconnect() {
    ++this.generation;
    this.account.disconnect();
    this.lastError = "";
    this.emit();
    return this.status();
  }
  resolveCreate() {
    this.data.pendingCreate = undefined;
    this.data.pendingMove = undefined;
    this.persist();
    this.lastError = "";
    this.emit();
    return this.status();
  }
  private async api<T = any>(
    route: string,
    method = "GET",
    body?: unknown,
    etag?: string,
  ): Promise<T> {
    if (!route.startsWith("/") || route.startsWith("//"))
      throw Error("잘못된 Google Tasks 요청입니다.");
    for (let attempt = 0; attempt < 2; attempt++) {
      let auth = this.account.auth();
      if (!auth) throw Error("Google Tasks에 로그인해 주세요.");
      if (attempt || auth.expiry_date < Date.now() + 60000)
        auth = await this.account.refresh();
      const response = await fetch(
        "https://tasks.googleapis.com/tasks/v1" + route,
        {
          method,
          headers: {
            Authorization: `Bearer ${auth.access_token}`,
            "Content-Type": "application/json",
            ...(etag ? { "If-Match": etag } : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (response.status === 401 && attempt === 0) continue;
      if (!response.ok) {
        if (response.status === 404)
          throw Object.assign(Error("Google Tasks 항목을 찾을 수 없습니다."), {
            status: 404,
          });
        throw Object.assign(Error(
          response.status === 403
            ? "Google Tasks API 사용 설정과 할 일 접근 권한을 확인한 뒤 다시 로그인해 주세요."
            : `Google Tasks 동기화 실패 (${response.status})`,
        ), { status: response.status });
      }
      return response.status === 204 ? (undefined as T) : response.json();
    }
    throw Error("Google Tasks에 다시 로그인해 주세요.");
  }
  private async collection<T>(route: string): Promise<T[]> {
    const items: T[] = [];
    let token: string | undefined;
    do {
      const url = new URL("https://tasks.googleapis.com/tasks/v1" + route);
      if (token) url.searchParams.set("pageToken", token);
      const page: { items?: T[]; nextPageToken?: string } = await this.api(
        url.pathname.replace("/tasks/v1", "") + url.search,
      );
      items.push(...(page.items || []));
      token = page.nextPageToken;
    } while (token);
    return items;
  }
  async lists() {
    const generation = this.generation;
    const lists = await this.collection<GoogleTaskList>("/users/@me/lists?maxResults=100");
    if (generation !== this.generation || !this.account.auth()) throw Error("계정 연결이 변경되었습니다.");
    this.data.lists = lists;
    this.persist();
    this.emit();
    return lists;
  }
  async selectList(id: string, autoSync = true) {
    if (this.flight) throw new Error("동기화를 마친 뒤 목록을 바꿔 주세요.");
    const lists = await this.lists();
    const allLists = id === "__all__";
    const list = allLists ? (lists.find(l => l.id === this.data.listId) || lists[0]) : lists.find(l => l.id === id);
    if (!list) throw new Error("목록을 다시 선택해 주세요.");
    this.data.allLists = allLists;
    this.data.listId = list.id;
    this.data.listName = allLists ? "전체 목록" : list.title;
    this.data.autoSync = autoSync;
    this.persist();
    this.emit();
    return this.status();
  }
  async createList() {
    const list = await this.api<GoogleTaskList>("/users/@me/lists", "POST", {
      title: "TOMO CALENDAR",
    });
    await this.selectList(list.id);
    return list;
  }
  autoSync(value: boolean) {
    this.data.autoSync = value === true;
    this.persist();
    this.emit();
    return this.status();
  }
  sync(): Promise<GoogleTasksStatus> {
    if (this.flight) return this.flight;
    if (!this.account.auth() || !this.data.listId || !this.data.accountId)
      return Promise.reject(
        new Error("로그인 후 동기화할 목록을 선택해 주세요."),
      );
    this.lastError = "";
    this.flight = this.runSync()
      .catch((error) => {
        this.lastError = error.message || "동기화에 실패했습니다.";
        throw error;
      })
      .finally(() => {
        this.flight = null;
        this.emit();
      });
    this.emit();
    return this.flight.then(() => this.status());
  }
  private async runSync(): Promise<GoogleTasksStatus> {
    const generation = this.generation;
    const ensureCurrent = () => {
      if (generation !== this.generation || !this.account.auth()) throw Error("계정 연결이 변경되었습니다.");
    };
    if (this.data.pendingMove) throw Error("이전 목록 이동 결과를 Google Tasks에서 확인한 뒤 연결 설정에서 다시 시도해 주세요.");
    let lists = this.data.allLists ? await this.lists() : this.data.lists;
    const ids = new Set(this.data.allLists ? (lists || []).map(l => l.id) : [this.data.listId!]);
    const snapshots = new Map<string, GoogleTask[]>();
    if (this.data.allLists) {
      // Fetch all lists before interpreting disappearance as a deletion.
      for (const id of ids) {
        const tasks = await this.collection<GoogleTask>(`/lists/${encodeURIComponent(id)}/tasks?showCompleted=true&showHidden=true&showDeleted=true&maxResults=100`);
        ensureCurrent();snapshots.set(id,tasks);
      }
      for (const mapping of this.data.mappings) {
        if (snapshots.get(mapping.listId!)?.some(t=>t.id===mapping.taskId && !t.deleted)) continue;
        const destinations=[...snapshots].filter(([id,tasks])=>id!==mapping.listId && tasks.some(t=>t.id===mapping.taskId && !t.deleted));
        if (destinations.length !== 1) continue;
        const destination=destinations[0][0];
        const latest=(this.store.get("todos") as TodoItem[]) || [];
        const original=latest.find(t=>t.id===mapping.localId);
        if (!original) { mapping.listId=destination;this.persist();continue; }
        const next=latest.map(t=>t.id===mapping.localId ? {...t,googleTasks:{accountId:this.data.accountId!,listId:destination,taskId:mapping.taskId},...(t.taskListId===mapping.listId?{taskListId:destination}:{})} : t);
        mapping.listId=destination;
        this.store.set("todos",next);this.notify("todos",next);this.persist();
      }
    }
    const todos = (this.store.get("todos") as TodoItem[]) || [];
    // Explicit list changes are processed even when only one list is selected.
    for (const task of todos) {
      ensureCurrent();
      if (!task.taskListId || task.taskListAccountId !== this.data.accountId) continue;
      const link = task.googleTasks;
      if (link && link.accountId === this.data.accountId && link.listId === task.taskListId) continue;
      if (!lists) lists = await this.lists();
      ensureCurrent();
      if (!lists.some(l => l.id === task.taskListId)) throw Error("할 일의 대상 목록을 다시 선택해 주세요.");
      if (!link || link.listId !== task.taskListId) ids.add(task.taskListId);
      if (!link || link.accountId !== this.data.accountId || link.listId === task.taskListId) continue;
      this.data.pendingMove = { localId: task.id, source: link.listId, destination: task.taskListId, taskId: link.taskId };
      this.persist();
      let moved: GoogleTask;
      try {
        moved = await this.api<GoogleTask>(`/lists/${encodeURIComponent(link.listId)}/tasks/${encodeURIComponent(link.taskId)}/move?destinationTasklist=${encodeURIComponent(task.taskListId)}`, "POST");
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500 && status !== 408) { this.data.pendingMove = undefined; this.persist(); }
        throw error;
      }
      ensureCurrent();
      snapshots.delete(link.listId);snapshots.delete(task.taskListId);
      const latest = (this.store.get("todos") as TodoItem[]) || [];
      const next = latest.map(t => t.id === task.id ? { ...t, googleTasks: { ...link, listId: task.taskListId!, taskId: moved.id } } : t);
      this.store.set("todos", next);this.notify("todos", next);
      const mapping = this.data.mappings.find(m => m.localId === task.id);
      this.data.mappings = this.data.mappings.filter(m => m.localId !== task.id);
      this.data.mappings.push({ localId: task.id, listId: task.taskListId, taskId: moved.id, localHash: mapping?.localHash || localTaskHash(task), remoteHash: mapping?.remoteHash || remoteTaskHash(moved) });
      this.data.pendingMove = undefined;this.persist();
    }
    for (const id of ids) { ensureCurrent(); await this.runListSync(id, snapshots.get(id)); }
    ensureCurrent();
    this.data.lastSync = new Date().toISOString();this.persist();
    return this.status();
  }
  private async runListSync(listId: string, snapshot?: GoogleTask[]): Promise<GoogleTasksStatus> {
    const generation = this.generation;
    const accountId = this.data.accountId!;
    const route = `/lists/${encodeURIComponent(listId)}/tasks`;
    const remote = snapshot || await this.collection<GoogleTask>(
      `${route}?showCompleted=true&showHidden=true&showDeleted=true&maxResults=100`,
    );
    const remotes = new Map(remote.map((task) => [task.id, task]));
    const local = ((this.store.get("todos") as TodoItem[]) || []).map((t) => ({
      ...t,
      date: new Date(t.date),
      createdAt: new Date(t.createdAt),
    }));
    const locals = new Map(local.map((t) => [t.id, t]));
    const mappings = this.data.mappings.filter(m => m.listId === listId);
    const ensureCurrent = () => {
      if (generation !== this.generation || !this.account.auth())
        throw new Error("계정 연결이 변경되었습니다.");
    };
    const applyLocal = (
      id: string,
      previous: TodoItem | undefined,
      next?: TodoItem,
    ) => {
      ensureCurrent();
      const latest = (this.store.get("todos") as TodoItem[]) || [];
      const current = latest.find((t) => t.id === id);
      // Do not overwrite typing performed while a network call was in flight.
      if (
        previous &&
        (!current || localTaskHash(current) !== localTaskHash(previous))
      )
        return false;
      const result = next
        ? current
          ? latest.map((t) => (t.id === id ? next : t))
          : [...latest, next]
        : latest.filter((t) => t.id !== id);
      // Preserve local-only edits and a newer destination selected during a request.
      if (current && next) {
        const index = result.findIndex(t => t.id === id);
        result[index] = { ...result[index], important: current.important, tags: current.tags, taskListId: current.taskListId, taskListAccountId: current.taskListAccountId };
      }
      this.store.set("todos", result);
      this.notify("todos", result);
      return true;
    };
    const saveMapping = (localTask: TodoItem, remoteTask: GoogleTask) => {
      ensureCurrent();
      const mapping = {
        localId: localTask.id,
        taskId: remoteTask.id,
        localHash: localTaskHash(localTask),
        remoteHash: remoteTaskHash(remoteTask),
        listId,
      };
      this.data.mappings = [
        ...this.data.mappings.filter((m) => m.localId !== localTask.id),
        mapping,
      ];
      this.persist();
      // Link the latest text even when applyLocal skipped an in-flight edit.
      const latest=(this.store.get("todos") as TodoItem[]) || [];
      const current=latest.find(t=>t.id===localTask.id);
      if (current && (current.googleTasks?.accountId!==accountId || current.googleTasks.listId!==listId || current.googleTasks.taskId!==remoteTask.id)) {
        const next=latest.map(t=>t.id===localTask.id ? {...t,googleTasks:{accountId,listId,taskId:remoteTask.id}} : t);
        this.store.set("todos",next);this.notify("todos",next);
      }
    };
    const forget = (id: string) => {
      this.data.mappings = this.data.mappings.filter((m) => m.localId !== id);
      this.persist();
    };
    const createRemote = async (task: TodoItem) => {
      ensureCurrent();
      // An operation journal prevents blindly retrying an ambiguous create response.
      // Google Tasks has no private metadata/idempotency key; ask the user to reconcile it.
      if (this.data.pendingCreate)
        throw new Error(
          "이전 할 일 추가 결과를 확인하지 못했습니다. Google Tasks 목록을 확인하고 연결 설정에서 다시 시도해 주세요.",
        );
      this.data.pendingCreate = task.id;
      this.persist();
      let created: GoogleTask;
      try { created = await this.api<GoogleTask>(route, "POST", localTaskBody(task)); }
      catch (error) { const status=(error as {status?:number}).status; if(status && status>=400 && status<500 && status!==408) { this.data.pendingCreate=undefined;this.persist(); } throw error; }
      const linked = {
        ...task,
        googleTasks: { accountId, listId, taskId: created.id },
      };
      applyLocal(task.id, task, linked);
      saveMapping(linked, created);
      this.data.pendingCreate = undefined;
      this.persist();
    };
    for (const map of mappings) {
      ensureCurrent();
      const l = locals.get(map.localId);
      const r = remotes.get(map.taskId);
      const action = taskSyncAction(map, l, r);
      if (action === "deleteRemote") {
        try {
          await this.api(
            `${route}/${encodeURIComponent(map.taskId)}`,
            "DELETE",
            undefined,
            r?.etag,
          );
        } catch (e) {
          if ((e as { status?: number }).status !== 404) throw e;
        }
        forget(map.localId);
      } else if (action === "forget") forget(map.localId);
      else if (action === "deleteLocal") {
        if (applyLocal(map.localId, l)) forget(map.localId);
      } else if (action === "recreate") await createRemote(l!);
      else if (action === "push") {
        const updated = await this.api<GoogleTask>(
          `${route}/${encodeURIComponent(map.taskId)}`,
          "PATCH",
          localTaskBody(l!),
          r?.etag,
        );
        saveMapping(l!, updated);
      } else if (action === "pull" || action === "conflict") {
        if (action === "conflict") {
          const copy = {
            ...l!,
            id: randomUUID(),
            content: `${l!.content} (로컬 사본)`,
            googleTasks: undefined,
            taskListId: listId,
            taskListAccountId: accountId,
            updatedAt: new Date(),
          };
          applyLocal(copy.id, undefined, copy);
        }
        const imported = importTask(r!, l!.id, accountId, listId, l);
        if (applyLocal(l!.id, l, imported)) saveMapping(imported, r!);
      }
    }
    for (const task of local) {
      ensureCurrent();
      const target = task.taskListAccountId === accountId && task.taskListId ? task.taskListId : this.data.listId;
      if (!this.data.mappings.some(m => m.localId === task.id) && (!task.googleTasks || (task.googleTasks.accountId !== accountId && task.taskListAccountId === accountId)) && target === listId)
        await createRemote(task);
      else if (
        !mappings.some((m) => m.localId === task.id) &&
        task.googleTasks?.accountId === accountId &&
        task.googleTasks.listId === listId
      ) {
        const r = remotes.get(task.googleTasks.taskId);
        if (r) {
          const imported = importTask(r, task.id, accountId, listId, task);
          if (applyLocal(task.id, task, imported)) saveMapping(imported, r);
        }
      }
    }
    for (const task of remote) {
      ensureCurrent();
      if (
        this.data.mappings.some((m) => m.listId === listId && m.taskId === task.id) ||
        mappings.some((m) => m.listId === listId && m.taskId === task.id)
      )
        continue;
      if (task.deleted) continue;
      const id = randomUUID();
      if (locals.has(id)) continue;
      const imported = importTask(task, id, accountId, listId);
      if (applyLocal(id, undefined, imported)) saveMapping(imported, task);
    }
    ensureCurrent();
    this.data.lastSync = new Date().toISOString();
    this.persist();
    return this.status();
  }
}

export function registerGoogleTasks(
  store: Store,
  notify: (key: string, value: unknown) => void,
) {
  const service = new GoogleTasksService(store, notify);
  ipcMain.handle("googleTasks-status", () => service.status());
  ipcMain.handle("googleTasks-login", () => service.login());
  ipcMain.handle("googleTasks-cancel", () => service.cancel());
  ipcMain.handle("googleTasks-disconnect", () => service.disconnect());
  ipcMain.handle("googleTasks-lists", () => service.lists());
  ipcMain.handle("googleTasks-select", (_, id: string) =>
    service.selectList(id),
  );
  ipcMain.handle("googleTasks-create-list", () => service.createList());
  ipcMain.handle("googleTasks-auto", (_, value: boolean) =>
    service.autoSync(value),
  );
  ipcMain.handle("googleTasks-sync", () => service.sync());
  ipcMain.handle("googleTasks-resolve-create", () => service.resolveCreate());
  const interval = setInterval(() => {
    const status = service.status();
    if (status.connected && status.listId && status.autoSync)
      void service.sync().catch(() => {});
  }, 60000);
  app.on("before-quit", () => {
    clearInterval(interval);
    service.cancel();
  });
  return service;
}
