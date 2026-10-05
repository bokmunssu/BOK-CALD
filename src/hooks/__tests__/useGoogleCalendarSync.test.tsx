import { act, renderHook } from "@testing-library/react";
import { RecoilRoot, useRecoilValue } from "recoil";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  moveEvent: vi.fn(),
  updateEvent: vi.fn(),
  getOrCreateCalendarForCategory: vi.fn(),
}));
vi.mock("../../services/googleCalendarService", () => ({
  googleCalendarService: api,
}));
import { useGoogleCalendarSync } from "../useGoogleCalendarSync";
import {
  categoriesState,
  eventsState,
  googleCalendarSyncState,
} from "../../store/atoms";
const event = {
  id: "local",
  title: "이동할 일정",
  date: new Date(2026, 9, 5),
  color: "#888888",
  categoryId: "new",
  googleEventId: "remote",
  googleCalendarId: "old-calendar",
};
beforeEach(() => {
  vi.clearAllMocks();
  api.moveEvent.mockResolvedValue("moved");
  api.updateEvent.mockResolvedValue(undefined);
});
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <RecoilRoot
      initializeState={({ set }) => {
        set(eventsState, [event]);
        set(categoriesState, [
          {
            id: "new",
            name: "새 분류",
            color: "#888888",
            googleCalendarId: "new-calendar",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
        set(googleCalendarSyncState, { isConnected: true, autoSync: true });
      }}
    >
      {children}
    </RecoilRoot>
  );
}
it("moves a category-changed event before updating its contents and stores its new IDs", async () => {
  const hook = renderHook(
    () => ({
      sync: useGoogleCalendarSync(),
      events: useRecoilValue(eventsState),
    }),
    { wrapper },
  );
  await act(async () => {
    expect(await hook.result.current.sync.updateGoogleEvent(event)).toBe(true);
  });
  expect(api.moveEvent).toHaveBeenCalledWith(
    "remote",
    "old-calendar",
    "new-calendar",
  );
  expect(api.updateEvent).toHaveBeenCalledWith("moved", event, "new-calendar");
  expect(hook.result.current.events[0]).toMatchObject({
    googleEventId: "moved",
    googleCalendarId: "new-calendar",
  });
});
it("retains a successful move when a subsequent content update fails", async () => {
  api.updateEvent.mockRejectedValue(new Error("offline"));
  const hook = renderHook(
    () => ({
      sync: useGoogleCalendarSync(),
      events: useRecoilValue(eventsState),
    }),
    { wrapper },
  );
  await act(async () => {
    expect(await hook.result.current.sync.updateGoogleEvent(event)).toBe(false);
  });
  expect(hook.result.current.events[0].googleCalendarId).toBe("new-calendar");
});
