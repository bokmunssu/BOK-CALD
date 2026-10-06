import { Event, GoogleCalendarEvent } from "@types";
import { electronStore } from "@utils/electronStore";

import { isHolidayCalendar } from "../utils/googleCalendar";

async function calendarRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const result = await window.electronAPI.googleAccount.request({ url, method: options.method, body: typeof options.body === 'string' ? options.body : undefined });
  return new Response(result.status === 204 ? null : JSON.stringify(result.data), { status: result.status, headers: { 'Content-Type': 'application/json' } });
}

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

type CalendarCache = {
  data: Array<{
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    accessRole?: string;
  }> | null;
  timestamp: number;
};

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;


  // 캐싱 레이어
  private calendarListCache: CalendarCache = {
    data: null,
    timestamp: 0,
  };
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  // Request Deduplication
  private pendingRequests = new Map<string, Promise<any>>();

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    await window.electronAPI.googleAccount.disconnect();
    await electronStore.delete("googleCalendarAuth");
    await electronStore.delete("googleCalendarSyncState");

    // 캐시 및 syncToken 초기화
    this.clearCache();
    await this.clearAllSyncTokens();
  }

  /**
   * 캐시 무효화
   */
  private clearCache(): void {
    this.calendarListCache = {
      data: null,
      timestamp: 0,
    };
    this.pendingRequests.clear();
  }

  /**
   * 캘린더별 syncToken 저장
   */
  private async saveSyncToken(calendarId: string, syncToken: string): Promise<void> {
    try {
      const syncTokens = (await electronStore.get("googleCalendarSyncTokens")) || {};
      syncTokens[calendarId] = syncToken;
      await electronStore.set("googleCalendarSyncTokens", syncTokens);
    } catch (error) {
      console.error("Failed to save syncToken:", error);
    }
  }

  /**
   * 캘린더별 syncToken 로드
   */
  private async loadSyncToken(calendarId: string): Promise<string | null> {
    try {
      const syncTokens = (await electronStore.get("googleCalendarSyncTokens")) || {};
      return syncTokens[calendarId] || null;
    } catch (error) {
      console.error("Failed to load syncToken:", error);
      return null;
    }
  }

  /**
   * 특정 캘린더의 syncToken 삭제
   */
  private async deleteSyncToken(calendarId: string): Promise<void> {
    try {
      const syncTokens = (await electronStore.get("googleCalendarSyncTokens")) || {};
      delete syncTokens[calendarId];
      await electronStore.set("googleCalendarSyncTokens", syncTokens);
    } catch (error) {
      console.error("Failed to delete syncToken:", error);
    }
  }

  /**
   * 모든 syncToken 삭제
   */
  private async clearAllSyncTokens(): Promise<void> {
    try {
      await electronStore.delete("googleCalendarSyncTokens");
    } catch (error) {
      console.error("Failed to clear syncTokens:", error);
    }
  }

  /**
   * 캘린더 목록 캐시 무효화 (외부에서 호출 가능)
   */
  invalidateCalendarListCache(): void {
    this.calendarListCache = {
      data: null,
      timestamp: 0,
    };
  }

  /**
   * 사용자 이메일 가져오기
   */
  async getUserEmail(): Promise<string> {
    const response = await calendarRequest('https://www.googleapis.com/oauth2/v2/userinfo');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to get user info:", errorData);
      throw new Error("Failed to get user info");
    }

    const data = await response.json();
    return data.email || "";
  }

  /**
   * 구글 캘린더에서 이벤트 가져오기 (병렬 처리 최적화)
   * @param timeMin 시작 날짜 (선택사항)
   * @param timeMax 종료 날짜 (선택사항)
   * @param calendarIds 가져올 캘린더 ID 배열 (선택사항, 없으면 모든 캘린더)
   * @returns 활성 이벤트 목록과 삭제된 이벤트 ID 목록
   */
  async fetchEvents(
    timeMin?: Date,
    timeMax?: Date,
    calendarIds?: string[]
  ): Promise<{
    events: GoogleCalendarEvent[];
    deletedEventIds: string[];
  }> {

    // 1. 캘린더 목록 가져오기 (캐시 활용)
    let calendars = (await this.listCalendars()).filter(cal => !isHolidayCalendar(cal.id));

    // calendarIds가 지정된 경우 필터링
    if (calendarIds && calendarIds.length > 0) {
      calendars = calendars.filter((cal) => calendarIds.includes(cal.id));
    }

    console.log(
      `🚀 Fetching events from ${calendars.length} calendars in parallel...`
    );

    // 2. 병렬로 각 캘린더에서 이벤트 가져오기
    const eventPromises = calendars.map((calendar) =>
      this.fetchEventsFromCalendar(
        calendar,
        timeMin,
        timeMax
      )
    );

    // 3. Promise.allSettled를 사용하여 일부 실패해도 계속 진행
    const results = await Promise.allSettled(eventPromises);

    // 4. 성공한 결과만 수집
    const allEvents: GoogleCalendarEvent[] = [];
    const allDeletedIds: string[] = [];
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value.events);
        allDeletedIds.push(...result.value.deletedEventIds);
        successCount++;
      } else {
        failCount++;
        console.warn(
          `Failed to fetch events from calendar: ${calendars[index].summary}`,
          result.reason
        );
      }
    });

    console.log(
      `✅ Fetched ${allEvents.length} events, ${allDeletedIds.length} deleted (${successCount}/${calendars.length} calendars succeeded, ${failCount} failed)`
    );

    return {
      events: allEvents,
      deletedEventIds: allDeletedIds,
    };
  }

  /**
   * 단일 캘린더에서 이벤트 가져오기 (내부 메서드)
   * syncToken을 사용한 증분 동기화 지원
   */
  private async fetchEventsFromCalendar(
    calendar: { id: string; summary: string },
    timeMin?: Date,
    timeMax?: Date
  ): Promise<{
    events: GoogleCalendarEvent[];
    deletedEventIds: string[];
  }> {
    const calendarId = calendar.id;
    const encodedCalendarId = encodeURIComponent(calendarId);

    // 저장된 syncToken 로드
    const syncToken = await this.loadSyncToken(calendarId);

    const allEvents: any[] = [];
    const deletedIds: string[] = [];
    let pageToken: string | undefined = undefined;
    let nextSyncToken: string | undefined = undefined;

    try {
      do {
        const params = new URLSearchParams({
          maxResults: "2500",
          showDeleted: "true", // 삭제된 이벤트도 가져오기
        });

        if (syncToken) {
          // 증분 동기화: syncToken 사용
          params.append("syncToken", syncToken);
          console.log(`📊 Incremental sync for calendar: ${calendar.summary}`);
        } else {
          // 전체 동기화: 날짜 범위 필터 사용
          params.append("singleEvents", "false"); // 반복 이벤트를 개별 인스턴스로 펼치지 않음
          if (timeMin) {
            params.append("timeMin", timeMin.toISOString());
          }
          if (timeMax) {
            params.append("timeMax", timeMax.toISOString());
          }
          console.log(`🔄 Full sync for calendar: ${calendar.summary}`);
        }

        // 페이징 처리
        if (pageToken) {
          params.append("pageToken", pageToken);
        }

        const response = await calendarRequest(
          `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${params.toString()}`,
          {
            headers: {
            },
          }
        );

        if (!response.ok) {
          // syncToken이 invalid한 경우 410 에러 발생
          if (response.status === 410 && syncToken) {
            console.warn(`⚠️ syncToken invalid for ${calendar.summary}, performing full sync`);
            await this.deleteSyncToken(calendarId);
            // 재귀 호출로 전체 동기화 수행
            return this.fetchEventsFromCalendar(calendar, timeMin, timeMax);
          }
          throw new Error(`Failed to fetch events (HTTP ${response.status})`);
        }

        const data = await response.json();

        // 이벤트 수집
        if (data.items && data.items.length > 0) {
          allEvents.push(...data.items);
        }

        // 다음 페이지 토큰
        pageToken = data.nextPageToken;

        // 동기화 토큰 (마지막 페이지에서만 제공됨)
        if (data.nextSyncToken) {
          nextSyncToken = data.nextSyncToken;
        }

      } while (pageToken); // 모든 페이지를 가져올 때까지 반복

      // syncToken 저장
      if (nextSyncToken) {
        await this.saveSyncToken(calendarId, nextSyncToken);
        console.log(`✅ Saved syncToken for ${calendar.summary}`);
      }

      // 이벤트 분류: 활성 이벤트 vs 삭제된 이벤트
      const activeEvents: GoogleCalendarEvent[] = [];

      for (const event of allEvents) {
        if (event.status === "cancelled") {
          // 삭제된 이벤트
          deletedIds.push(`${calendarId}_${event.id}`);
        } else {
          // 활성 이벤트 (추가 또는 수정)
          activeEvents.push({
            id: `${calendarId}_${event.id}`,
            originalEventId: event.id,
            summary: event.summary || "제목 없음",
            description: event.description || undefined,
            calendarId: calendarId,
            calendarName: calendar.summary,
            start: {
              dateTime: event.start?.dateTime || undefined,
              date: event.start?.date || undefined,
              timeZone: event.start?.timeZone || undefined,
            },
            end: {
              dateTime: event.end?.dateTime || undefined,
              date: event.end?.date || undefined,
              timeZone: event.end?.timeZone || undefined,
            },
            colorId: event.colorId || undefined,
            recurrence: event.recurrence || undefined,
          });
        }
      }

      return {
        events: activeEvents,
        deletedEventIds: deletedIds,
      };

    } catch (error) {
      console.error(`Failed to fetch events from ${calendar.summary}:`, error);
      throw error;
    }
  }

  /**
   * 구글 캘린더로 이벤트 보내기
   * @param event 이벤트 데이터
   * @param calendarId 캘린더 ID (기본값: "primary")
   */
  async createEvent(
    event: Event,
    calendarId: string = "primary"
  ): Promise<string> {
    const googleEvent = this.convertToGoogleEvent(event);

    // 로컬 이벤트 ID를 구글 이벤트 extendedProperties.private에 저장
    if (!googleEvent.extendedProperties) {
      googleEvent.extendedProperties = { private: {} };
    } else if (!googleEvent.extendedProperties.private) {
      googleEvent.extendedProperties.private = {};
    }
    if (event.id) {
      googleEvent.extendedProperties.private.tomo_local_id = String(event.id);
    }

    const encodedCalendarId = encodeURIComponent(calendarId);
    const response = await calendarRequest(
      `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create event");
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * 구글 캘린더 이벤트 업데이트
   * @param googleEventId 구글 캘린더 이벤트 ID
   * @param event 이벤트 데이터
   * @param calendarId 캘린더 ID (기본값: "primary")
   */
  async moveEvent(eventId: string, source: string, destination: string): Promise<string> {
    const response = await calendarRequest(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(source)}/events/${encodeURIComponent(eventId)}/move?destination=${encodeURIComponent(destination)}`, { method: "POST", headers: { }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Google 일정 이동 실패 (${response.status}). 대상 캘린더 쓰기 권한을 확인해 주세요.`);
    return (await response.json()).id;
  }

  async updateEvent(
    googleEventId: string,
    event: Event,
    calendarId: string = "primary"
  ): Promise<void> {
    const googleEvent = this.convertToGoogleEvent(event);

    const encodedCalendarId = encodeURIComponent(calendarId);
    const response = await calendarRequest(
      `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update event");
    }
  }

  /**
   * 구글 캘린더 이벤트 삭제
   * @param googleEventId 구글 캘린더 이벤트 ID
   * @param calendarId 캘린더 ID (기본값: "primary")
   */
  async deleteEvent(
    googleEventId: string,
    calendarId: string = "primary"
  ): Promise<void> {

    const encodedCalendarId = encodeURIComponent(calendarId);
    const response = await calendarRequest(
      `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "DELETE",
        headers: {
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete event");
    }
  }

  /**
   * 날짜를 YYYY-MM-DD 형식으로 포맷 (로컬 타임존 기준)
   */
  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * 앱 이벤트를 구글 캘린더 형식으로 변환
   */
  private convertToGoogleEvent(event: Event): any {
    const googleEvent: any = {
      summary: event.title,
      description: event.description || "",
      extendedProperties: { private: { tomo_local_id: event.id } },
    };

    // 종일 이벤트 처리
    if (event.isAllDay) {
      // 로컬 타임존 기준으로 날짜 포맷 (UTC 변환하지 않음)
      googleEvent.start = {
        date: this.formatDateOnly(event.date),
      };

      // 구글 캘린더의 종료 날짜는 exclusive이므로 하루 더하기
      const endDate = event.endDate
        ? new Date(event.endDate)
        : new Date(event.date);
      endDate.setDate(endDate.getDate() + 1);

      googleEvent.end = {
        date: this.formatDateOnly(endDate),
      };
    } else {
      // 시간이 있는 이벤트
      const startDateTime = this.combineDateAndTime(
        event.date,
        event.startTime
      );
      const endDateTime = event.endTime
        ? this.combineDateAndTime(event.endDate || event.date, event.endTime)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000); // 기본 1시간

      googleEvent.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      googleEvent.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // 반복 일정 처리
    if (event.recurrence) {
      googleEvent.recurrence = this.convertToGoogleRecurrence(event.recurrence);
    }

    return googleEvent;
  }

  /**
   * 날짜와 시간을 결합
   */
  private combineDateAndTime(date: Date, time?: string): Date {
    if (!time) return date;

    const [hours, minutes] = time.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  /**
   * 앱 반복 규칙을 구글 캘린더 RRULE 형식으로 변환
   */
  private convertToGoogleRecurrence(recurrence: any): string[] {
    const freq = recurrence.frequency.toUpperCase();
    const interval = recurrence.interval || 1;

    let rrule = `RRULE:FREQ=${freq};INTERVAL=${interval}`;

    if (recurrence.occurrences) {
      rrule += `;COUNT=${recurrence.occurrences}`;
    } else if (recurrence.endDate) {
      const until =
        recurrence.endDate.toISOString().replace(/[-:]/g, "").split(".")[0] +
        "Z";
      rrule += `;UNTIL=${until}`;
    }

    return [rrule];
  }

  /**
   * 유효한 토큰 확보 (필요시 갱신)
   */
  /**
   * 새로운 캘린더 생성
   * @param summary 캘린더 이름
   * @param description 캘린더 설명 (선택사항)
   * @param timeZone 시간대 (선택사항, 기본값: 시스템 시간대)
   * @returns 생성된 캘린더의 ID
   */
  async createCalendar(
    summary: string,
    description?: string,
    timeZone?: string
  ): Promise<string> {

    const calendarData = {
      summary,
      description,
      timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const response = await calendarRequest(`${CALENDAR_API_BASE}/calendars`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to create calendar:", errorData);
      throw new Error(
        `Failed to create calendar: ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    this.calendarListCache = { data: null, timestamp: 0 };
    return data.id;
  }

  /**
   * 캘린더 목록 가져오기 (캐싱 + Request Deduplication 적용)
   * @param forceRefresh 캐시 무시하고 강제로 새로고침
   * @returns 캘린더 목록
   */
  async listCalendars(forceRefresh: boolean = false): Promise<
    Array<{
      id: string;
      summary: string;
      description?: string;
      primary?: boolean;
      accessRole?: string;
    }>
  > {
    // 1. 캐시 확인
    const now = Date.now();
    const cacheValid =
      this.calendarListCache.data !== null &&
      now - this.calendarListCache.timestamp < this.CACHE_TTL;

    if (!forceRefresh && cacheValid) {
      console.log("📦 Using cached calendar list");
      return this.calendarListCache.data!;
    }

    // 2. Request Deduplication - 이미 진행 중인 요청이 있으면 재사용
    const requestKey = "listCalendars";
    if (this.pendingRequests.has(requestKey)) {
      console.log("🔄 Reusing pending calendar list request");
      return this.pendingRequests.get(requestKey)!;
    }

    // 3. 새 요청 생성
    const requestPromise = this.fetchCalendarList();
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const calendars = await requestPromise;

      // 4. 캐시 업데이트
      this.calendarListCache = {
        data: calendars,
        timestamp: Date.now(),
      };

      console.log(`✅ Fetched ${calendars.length} calendars from API`);
      return calendars;
    } finally {
      // 5. 요청 완료 후 pending requests에서 제거
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 실제 API 호출을 수행하는 내부 메서드
   */
  private async fetchCalendarList(): Promise<
    Array<{
      id: string;
      summary: string;
      description?: string;
      primary?: boolean;
      accessRole?: string;
    }>
  > {

    const response = await calendarRequest(`${CALENDAR_API_BASE}/users/me/calendarList`, {
      headers: {
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to list calendars:", errorData);
      throw new Error(`Failed to list calendars: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return (data.items || []).map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description,
      primary: calendar.primary,
      accessRole: calendar.accessRole,
    }));
  }

  /**
   * 카테고리를 위한 구글 캘린더 ID 가져오기 또는 생성
   * @param categoryId 카테고리 ID
   * @param categoryName 카테고리 이름
   * @param categoryDescription 카테고리 설명 (선택사항)
   * @returns 구글 캘린더 ID
   */
  async getOrCreateCalendarForCategory(
    categoryId: string,
    categoryName: string,
    categoryDescription?: string
  ): Promise<string> {
    // 기본 카테고리는 primary 캘린더 사용
    if (categoryId === "default") {
      return "primary";
    }

    const key = `category:${categoryId}`;
    if (this.pendingRequests.has(key)) return this.pendingRequests.get(key)!;
    const request = this.resolveCategoryCalendar(categoryName, categoryDescription);
    this.pendingRequests.set(key, request);
    try { return await request; } finally { this.pendingRequests.delete(key); }
  }

  private async resolveCategoryCalendar(categoryName: string, categoryDescription?: string): Promise<string> {
    // 카테고리 ID로 캘린더 찾기 (summary에서 검색)
    const calendars = await this.listCalendars();
    const existingCalendar = calendars.find(
      (cal) => cal.summary === `[TOMO] ${categoryName}`
    );

    if (existingCalendar) {
      return existingCalendar.id;
    }

    // 없으면 새로 생성
    const calendarId = await this.createCalendar(
      `[TOMO] ${categoryName}`,
      categoryDescription,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    return calendarId;
  }

  /**
   * 카테고리에 해당하는 구글 캘린더 삭제
   * @param calendarId 구글 캘린더 ID
   */
  async deleteCalendar(calendarId: string): Promise<void> {

    const encodedCalendarId = encodeURIComponent(calendarId);
    const response = await calendarRequest(
      `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}`,
      {
        method: "DELETE",
        headers: {
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to delete calendar:", errorData);
      throw new Error(
        `Failed to delete calendar: ${JSON.stringify(errorData)}`
      );
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
