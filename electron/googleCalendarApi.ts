import type { GoogleAccount } from './googleAccount';
import type { CalendarRequest, CalendarResponse } from '../src/types/calendarApi';

export function validateCalendarRequest(input: CalendarRequest) {
  if (!input || typeof input.url !== 'string' || input.url.length > 8192) throw new Error('잘못된 Google 요청입니다.');
  const url = new URL(input.url);
  const method = input.method || 'GET';
  if (url.origin !== 'https://www.googleapis.com' || url.username || url.password || url.hash) throw new Error('허용되지 않은 Google 주소입니다.');
  const route = url.pathname;
  const segment = '[^/]+';
  const calendar = '/calendar/v3/calendars/' + segment;
  const events = calendar + '/events';
  const allowed = method === 'GET'
    ? route === '/oauth2/v2/userinfo' || route === '/calendar/v3/users/me/calendarList' || new RegExp('^' + events + '$').test(route)
    : method === 'POST'
      ? route === '/calendar/v3/calendars' || new RegExp('^' + events + '(' + '/' + segment + '/move)?$').test(route)
      : method === 'PUT' ? new RegExp('^' + events + '/' + segment + '$').test(route)
        : method === 'DELETE' && new RegExp('^' + calendar + '(/events/' + segment + ')?$').test(route);
  const queryKeys = new Set(['maxResults', 'showDeleted', 'syncToken', 'singleEvents', 'timeMin', 'timeMax', 'pageToken', 'destination']);
  if (!allowed || route.split('/').some(s => decodeURIComponent(s).split(/[\\/]/).some(p => p === '.' || p === '..'))
    || [...url.searchParams.keys()].some(key => !queryKeys.has(key))) throw new Error('허용되지 않은 Google 작업입니다.');
  if (input.body !== undefined && (typeof input.body !== 'string' || Buffer.byteLength(input.body) > 256 * 1024
    || !['POST', 'PUT'].includes(method))) throw new Error('Google 요청 데이터가 너무 크거나 잘못되었습니다.');
  if (input.body !== undefined) {
    const body = JSON.parse(input.body);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('잘못된 Google 요청 데이터입니다.');
  }
  return { url, method, body: input.body };
}

export class GoogleCalendarApi {
  private inFlight = 0;
  private minute = 0;
  private count = 0;
  private blockedUntil = 0;
  constructor(private account: GoogleAccount) {}
  async request(input: CalendarRequest): Promise<CalendarResponse> {
    const { url, method, body } = validateCalendarRequest(input);
    const now = Date.now();
    if (now - this.minute >= 60000) { this.minute = now; this.count = 0; }
    if (now < this.blockedUntil || this.count >= 600 || this.inFlight >= 16) throw new Error('Google 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
    this.count++; this.inFlight++;
    try {
      let auth = this.account.auth();
      if (!auth) throw new Error('구글 계정에 다시 로그인해 주세요.');
      if (!auth.expiry_date || auth.expiry_date < Date.now() + 60000) auth = await this.account.refresh();
      const generation = this.account.sessionGeneration();
      const response = await fetch(url, { method, body, redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { Authorization: 'Bearer ' + auth.access_token, ...(body ? { 'Content-Type': 'application/json' } : {}) } });
      if (response.status === 429 || response.status === 403) this.blockedUntil = Date.now() + 60000;
      const text = await response.text();
      if (generation !== this.account.sessionGeneration()) throw new Error('구글 연결이 변경되었습니다.');
      const data = text ? JSON.parse(text) : null;
      return { status: response.status, data: url.pathname === '/oauth2/v2/userinfo' && response.ok ? { email: data?.email || '' } : data };
    } finally { this.inFlight--; }
  }
}
