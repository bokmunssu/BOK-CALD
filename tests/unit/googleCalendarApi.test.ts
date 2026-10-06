import { beforeEach, describe, it, expect, vi } from 'vitest';
import { GoogleCalendarApi, validateCalendarRequest } from '../../electron/googleCalendarApi';
const base = 'https://www.googleapis.com/calendar/v3';
beforeEach(() => { vi.unstubAllGlobals(); });
describe('main process Calendar requests', () => {
  it('rejects arbitrary hosts, operations, path traversal and oversized writes', () => {
    for (const request of [
      {url:'https://evil.example/calendar/v3/calendars'},
      {url:base+'/calendars',method:'GET'},
      {url:base+'/calendars/a/events?key=anything'},
      {url:base+'/calendars/a/events/%2e%2e%2fsecret',method:'PUT'},
      {url:base+'/calendars',method:'POST',body:'x'.repeat(300000)},
    ]) expect(() => validateCalendarRequest(request)).toThrow();
  });
  it('uses internal credentials without returning them and forbids redirects', async () => {
    const account = { auth: () => ({access_token:'private-access',refresh_token:'private-refresh',expiry_date:Date.now()+3600000}), sessionGeneration: () => 1 };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({email:'user@example.com',id:'profile'})));
    vi.stubGlobal('fetch',fetch);
    const result = await new GoogleCalendarApi(account as any).request({url:'https://www.googleapis.com/oauth2/v2/userinfo'});
    expect(result).toEqual({status:200,data:{email:'user@example.com'}});
    expect(JSON.stringify(result)).not.toContain('private-');
    expect(fetch.mock.calls[0][1]).toMatchObject({redirect:'error',headers:{Authorization:'Bearer private-access'}});
  });
  it('refreshes internally and accepts empty delete responses', async () => {
    const account = {auth:()=>({expiry_date:0}),refresh:vi.fn().mockResolvedValue({access_token:'new'}),sessionGeneration:()=>1};
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:204})));
    const result=await new GoogleCalendarApi(account as any).request({url:base+'/calendars/a/events/b',method:'DELETE'});
    expect(account.refresh).toHaveBeenCalledOnce();expect(result).toEqual({status:204,data:null});
  });
  it('halts requests temporarily after a quota response', async () => {
    const account={auth:()=>({expiry_date:Date.now()+3600000}),sessionGeneration:()=>1};
    const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:429}));vi.stubGlobal('fetch',fetch);
    const api=new GoogleCalendarApi(account as any);
    await api.request({url:base+'/users/me/calendarList'});
    await expect(api.request({url:base+'/users/me/calendarList'})).rejects.toThrow('잠시');expect(fetch).toHaveBeenCalledOnce();
  });
});
