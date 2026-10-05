import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TodoItem } from "../../src/types";
import { localTaskHash, remoteTaskHash } from "../../src/utils/googleTasks";
vi.mock("electron", () => ({
  app: { on: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: vi.fn() },
  shell: { openExternal: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
}));
vi.mock("../../electron/googleAccount", () => ({
  GoogleAccount: class {
    connected = true;
    info() {
      return { configured: true };
    }
    auth() {
      return this.connected
        ? { access_token: "token", expiry_date: Date.now() + 3600000 }
        : null;
    }
    disconnect() {
      this.connected = false;
    }
    cancel() {}
  },
}));
import { GoogleTasksService } from "../../electron/googleTasks";
const task: TodoItem = {
  id: "local",
  content: "작업",
  completed: false,
  important: false,
  date: new Date(2026, 9, 5),
  createdAt: new Date(2026, 9, 5),
};
const remote = {
  id: "remote",
  title: "작업",
  status: "needsAction" as const,
  due: "2026-10-05T00:00:00.000Z",
  etag: "etag",
};
function setup(todos: TodoItem[] = [], mapped = false) {
  const data: Record<string, any> = {
    todos,
    googleTasksSync: {
      accountId: "account",
      listId: "list",
      autoSync: true,
      mappings: mapped
        ? [
            {
              localId: task.id,
              taskId: remote.id,
              localHash: localTaskHash(task),
              remoteHash: remoteTaskHash(remote),
            },
          ]
        : [],
    },
  };
  const store = {
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    },
  };
  return { service: new GoogleTasksService(store as any, vi.fn()), data };
}
function response(value: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
beforeEach(() => {
  vi.restoreAllMocks();
});
describe("Google Tasks service", () => {
  it('does not upload tasks from inactive lists when switching a single-list selection',async()=>{
    const {service,data}=setup([{...task,googleTasks:{accountId:'account',listId:'old',taskId:'old-task'}}]);
    data.googleTasksSync.mappingSets={old:[{localId:'local',taskId:'old-task',localHash:localTaskHash(task),remoteHash:remoteTaskHash(remote)}]};
    // Reconstruct to exercise migration from the previous per-list storage.
    const migrated=new GoogleTasksService({get:(key:string)=>data[key],set:(key:string,value:any)=>{data[key]=value;}} as any,vi.fn());
    const request=vi.spyOn(globalThis,'fetch').mockResolvedValue(response({items:[]}));
    await migrated.sync();
    expect(data.todos).toHaveLength(1);expect(data.googleTasksSync.mappings[0].listId).toBe('old');
    expect(request.mock.calls.filter(c=>c[1]?.method!=='GET')).toHaveLength(0);
  });
  it('adds an unassigned task only once during all-list synchronization',async()=>{
    const {service,data}=setup([task]);data.googleTasksSync.allLists=true;
    const request=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,options)=>String(url).includes('/users/')?response({items:[{id:'list',title:'기본'},{id:'study',title:'공부'}]}):options?.method==='POST'?response(remote):response({items:[]}));
    await service.sync();
    expect(request.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(1);
    expect(data.todos).toHaveLength(1);expect(data.todos[0].googleTasks.listId).toBe('list');
  });
  it('propagates a deletion even if the remote item moved lists',async()=>{
    const {service,data}=setup([],true);data.googleTasksSync.allLists=true;
    const request=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,options)=>String(url).includes('/users/')?response({items:[{id:'list',title:'기본'},{id:'study',title:'공부'}]}):options?.method==='DELETE'?response(null,204):response({items:String(url).includes('/study/')?[remote]:[]}));
    await service.sync();expect(data.todos).toEqual([]);
    expect(request.mock.calls.find(c=>c[1]?.method==='DELETE')?.[0]).toContain('/lists/study/tasks/remote');
  });
  it('preserves an importance edit made during a remote pull',async()=>{
    const {service,data}=setup([{...task,googleTasks:{accountId:'account',listId:'list',taskId:'remote'}}],true);
    vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{data.todos[0]={...data.todos[0],important:true};return response({items:[{...remote,title:'원격 수정'}]});});
    await service.sync();expect(data.todos[0]).toMatchObject({content:'원격 수정',important:true});
  });
  it("syncs all lists without mixing identical task IDs or creating duplicates", async () => {
    const {service,data}=setup();
    data.googleTasksSync.allLists=true;
    const request=vi.spyOn(globalThis,"fetch").mockImplementation(async url=>String(url).includes('/users/@me/lists') ? response({items:[{id:'list',title:'내 할 일'},{id:'study',title:'공부'}]}) : response({items:[{...remote,title:String(url).includes('/study/')?'공부':'내 할 일'}]}));
    await service.sync();await service.sync();
    expect(data.todos).toHaveLength(2);
    expect(data.todos.map((t:TodoItem)=>t.googleTasks?.listId).sort()).toEqual(['list','study']);
    expect(request.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(0);
    expect(service.status().listId).toBe('__all__');
  });
  it("moves a task between lists using the native move API and keeps local-only fields", async()=>{
    const {service,data}=setup([{...task,important:true,taskListId:'study',taskListAccountId:'account',googleTasks:{accountId:'account',listId:'list',taskId:'remote'}}],true);
    data.googleTasksSync.lists=[{id:'list',title:'내 할 일'},{id:'study',title:'공부'}];
    const request=vi.spyOn(globalThis,'fetch').mockImplementation(async (url,options)=> options?.method==='POST' ? response({...remote,id:'moved'}) : response({items:String(url).includes('/study/')?[{...remote,id:'moved'}]:[]}));
    await service.sync();
    const [url,options]=request.mock.calls[0];
    expect(new URL(String(url)).searchParams.get('destinationTasklist')).toBe('study');
    expect(options?.body).toBeUndefined();
    expect(data.todos[0]).toMatchObject({important:true,googleTasks:{listId:'study',taskId:'moved'}});
    expect(data.googleTasksSync.mappings).toHaveLength(1);
    expect(data.googleTasksSync.mappings[0]).toMatchObject({listId:'study',taskId:'moved'});
  });
  it("keeps a move journal and does not repeat an ambiguous move",async()=>{
    const {service,data}=setup([{...task,taskListId:'study',taskListAccountId:'account',googleTasks:{accountId:'account',listId:'list',taskId:'remote'}}],true);
    data.googleTasksSync.lists=[{id:'study',title:'공부'}];
    const request=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('lost response'));
    await expect(service.sync()).rejects.toThrow('lost response');
    expect(service.status().needsReview).toBe(true);
    await expect(service.sync()).rejects.toThrow('이전 목록 이동');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("recognizes a remote list move before treating it as a deletion",async()=>{
    const {service,data}=setup([{...task,important:true,taskListId:'list',taskListAccountId:'account',googleTasks:{accountId:'account',listId:'list',taskId:'remote'}}],true);
    data.googleTasksSync.allLists=true;
    vi.spyOn(globalThis,'fetch').mockImplementation(async url=>String(url).includes('/users/')?response({items:[{id:'list',title:'내 할 일'},{id:'study',title:'공부'}]}):response({items:String(url).includes('/study/')?[remote]:[]}));
    await service.sync();
    expect(data.todos).toHaveLength(1);expect(data.todos[0]).toMatchObject({id:'local',important:true,taskListId:'study',googleTasks:{listId:'study'}});
  });
  it("imports every page and saves mappings without duplicate imports", async () => {
    const { service, data } = setup();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ items: [remote], nextPageToken: "next" }),
      )
      .mockResolvedValueOnce(
        response({
          items: [{ ...remote, id: "second", title: "다음 페이지" }],
        }),
      );
    await service.sync();
    expect(data.todos).toHaveLength(2);
    expect(data.googleTasksSync.mappings).toHaveLength(2);
    fetch.mockResolvedValue(
      response({
        items: [remote, { ...remote, id: "second", title: "다음 페이지" }],
      }),
    );
    await service.sync();
    expect(data.todos).toHaveLength(2);
    expect(service.status().syncing).toBe(false);
  });
  it("uploads completion changes with concurrency protection", async () => {
    const { service, data } = setup([{ ...task, completed: true }], true);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ items: [remote] }))
      .mockResolvedValueOnce(response({ ...remote, status: "completed" }));
    await service.sync();
    const options = fetch.mock.calls[1][1]!;
    expect(options.method).toBe("PATCH");
    expect((options.headers as any)["If-Match"]).toBe("etag");
    expect(JSON.parse(options.body as string).status).toBe("completed");
    expect(data.googleTasksSync.mappings[0].localHash).toBe(
      localTaskHash(data.todos[0]),
    );
  });
  it("preserves a local copy when both sides edited", async () => {
    const { service, data } = setup([{ ...task, content: "로컬 수정" }], true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ items: [{ ...remote, title: "원격 수정" }] }),
    );
    await service.sync();
    expect(data.todos.map((t: TodoItem) => t.content)).toEqual([
      "원격 수정",
      "로컬 수정 (로컬 사본)",
    ]);
  });
  it("propagates a local deletion and removes its mapping", async () => {
    const { service, data } = setup([], true);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ items: [remote] }))
      .mockResolvedValueOnce(response(null, 204));
    await service.sync();
    expect(fetch.mock.calls[1][1]?.method).toBe("DELETE");
    expect(data.googleTasksSync.mappings).toEqual([]);
  });
  it("does not blindly repeat a create after a lost response", async () => {
    const { service, data } = setup([task]);
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ items: [] }))
      .mockRejectedValueOnce(new Error("Network connection lost"));
    await expect(service.sync()).rejects.toThrow("Network connection lost");
    expect(data.googleTasksSync.pendingCreate).toBe("local");
    request.mockResolvedValue(response({ items: [] }));
    await expect(service.sync()).rejects.toThrow("이전 할 일 추가");
    expect(
      request.mock.calls.filter((c) => c[1]?.method === "POST"),
    ).toHaveLength(1);
  });
  it("keeps an edit made during an upload for the next sync", async () => {
    const { service, data } = setup([task]);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ items: [] }))
      .mockImplementationOnce(async () => {
        data.todos = [{ ...task, content: "입력 중 변경" }];
        return response(remote);
      });
    await service.sync();
    expect(data.todos[0].content).toBe("입력 중 변경");
    expect(data.todos[0].googleTasks).toMatchObject({accountId:'account',listId:'list',taskId:'remote'});
    expect(data.googleTasksSync.mappings[0].localHash).toBe(
      localTaskHash(task),
    );
  });
  it("encodes pagination tokens without changing the API host", async () => {
    const { service } = setup();
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({
          items: [],
          nextPageToken: "https://other.example/?secret=1",
        }),
      )
      .mockResolvedValueOnce(response({ items: [] }));
    await service.sync();
    const url = new URL(String(request.mock.calls[1][0]));
    expect(url.origin).toBe("https://tasks.googleapis.com");
    expect(url.searchParams.get("pageToken")).toBe(
      "https://other.example/?secret=1",
    );
  });
  it("cannot persist changes after disconnect during a request", async () => {
    const { service, data } = setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      service.disconnect();
      return response({ items: [remote] });
    });
    await expect(service.sync()).rejects.toThrow("계정 연결이 변경");
    expect(data.todos).toEqual([]);
  });
});
