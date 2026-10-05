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
