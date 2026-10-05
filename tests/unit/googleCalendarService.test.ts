import { beforeEach, describe, it, expect, vi } from "vitest";
const data = vi.hoisted(() => new Map());
vi.mock("../../src/utils/electronStore", () => ({
  electronStore: {
    get: vi.fn(async (k: string) => data.get(k)),
    set: vi.fn(async (k: string, v: unknown) => data.set(k, v)),
  },
}));
import { GoogleCalendarService } from "../../src/services/googleCalendarService";
function response(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
}
beforeEach(() => {
  vi.restoreAllMocks();
  data.clear();
  vi.stubGlobal("window", {
    electronAPI: {
      googleAccount: {
        auth: async () => ({
          access_token: "test",
          expiry_date: Date.now() + 3600000,
        }),
      },
    },
  });
});
describe("Google calendar writes", () => {
  it("deduplicates concurrent category creation and invalidates the calendar cache", async () => {
    const service = GoogleCalendarService.getInstance();
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ id: "new-calendar" }))
      .mockResolvedValueOnce(
        response({
          items: [{ id: "new-calendar", summary: "[TOMO] 새 분류" }],
        }),
      );
    await service.listCalendars(true);
    expect(
      await Promise.all([
        service.getOrCreateCalendarForCategory("new", "새 분류"),
        service.getOrCreateCalendarForCategory("new", "새 분류"),
      ]),
    ).toEqual(["new-calendar", "new-calendar"]);
    expect((await service.listCalendars())[0].id).toBe("new-calendar");
    expect(
      request.mock.calls.filter((c) => c[1]?.method === "POST"),
    ).toHaveLength(1);
  });
  it("moves using encoded source and destination identifiers", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response({ id: "moved" }));
    expect(
      await GoogleCalendarService.getInstance().moveEvent(
        "event/id",
        "old@calendar",
        "new@calendar",
      ),
    ).toBe("moved");
    const url = new URL(String(request.mock.calls[0][0]));
    expect(url.pathname).toContain("old%40calendar/events/event%2Fid/move");
    expect(url.searchParams.get("destination")).toBe("new@calendar");
  });
  it("never fetches holiday subscriptions as user schedules", async () => {
    const service = GoogleCalendarService.getInstance();
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({
          items: [
            {
              id: "ko.south_korea#holiday@group.v.calendar.google.com",
              summary: "공휴일",
            },
          ],
        }),
      );
    await service.listCalendars(true);
    expect((await service.fetchEvents()).events).toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
